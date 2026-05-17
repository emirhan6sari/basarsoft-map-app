using BasarsoftOdev.BLL.Interfaces;
using BasarsoftOdev.DAL.AppLogging;
using BasarsoftOdev.DAL.Data;
using Npgsql;
using BasarsoftOdev.DAL.Identity;
using BasarsoftOdev.DAL.Repositories;
using BasarsoftOdev.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BasarsoftOdev.DAL;

public static class DependencyInjection
{
    public static IServiceCollection AddDataAccessLayer(
        this IServiceCollection services,
        IConfiguration configuration,
        string connectionString,
        bool useInMemoryDatabase = false,
        string? inMemoryDatabaseName = null)
    {
        NpgsqlDataSource? npgsqlDataSource = null;
        if (!useInMemoryDatabase)
        {
            npgsqlDataSource = NpgsqlConnectionHelper.CreateDataSource(connectionString);
            services.AddSingleton(npgsqlDataSource);
        }

        services.AddDbContext<AppDbContext>(options =>
        {
            if (useInMemoryDatabase)
                options.UseInMemoryDatabase(inMemoryDatabaseName ?? "BasarsoftTestDb");
            else
                options.UseNpgsql(npgsqlDataSource!);
        });

        services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
            {
                // admin varsayılan şifresi "admin" (5 karakter) için
                options.Password.RequiredLength = 5;
                options.Password.RequireDigit = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequiredUniqueChars = 1;
                options.User.RequireUniqueEmail = false;
            })
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders()
            .AddErrorDescriber<TurkishIdentityErrorDescriber>();

        services.AddScoped<IMapPointRepository, MapPointRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();

        if (useInMemoryDatabase)
            services.AddSingleton<IAppLogWriter, NullAppLogWriter>();
        else
            services.AddSingleton<IAppLogWriter, AppLogWriter>();

        return services;
    }

    public static async Task ApplyMigrationsAsync(this IHost host)
    {
        using var scope = host.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

        var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
        if (pending.Count == 0)
        {
            logger.LogInformation("Bekleyen migration yok.");
            return;
        }

        logger.LogInformation("Migration uygulanıyor: {Migrations}", string.Join(", ", pending));
        try
        {
            await db.Database.MigrateAsync();
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42883" && ex.MessageText.Contains("postgis_version", StringComparison.OrdinalIgnoreCase))
        {
            var cs = db.Database.GetConnectionString()
                ?? throw new InvalidOperationException("Connection string bulunamadı.");
            logger.LogWarning("postgis_version hatası — veritabanı temizlenip migration yeniden deneniyor.");
            await DatabaseBootstrap.PrepareAsync(cs, logger);
            await db.Database.MigrateAsync();
        }

        logger.LogInformation("Migration tamamlandı.");
    }

    /// <summary>
    /// Uygulama başlangıcında çağrılır. Rolleri (Admin, User) ve varsayılan
    /// admin kullanıcısını idempotent olarak oluşturur:
    ///   - Roller yoksa: Admin ve User rolleri eklenir.
    ///   - 'admin' kullanıcısı yoksa: UserName="admin", Password="admin"
    ///     (geliştirme amaçlı — UserManager şifreyi otomatik hash'ler).
    ///   - Daha önce oluşturulmuşsa atlanır (uygulamayı tekrar başlatmak güvenli).
    /// </summary>
    public static async Task SeedDatabaseAsync(this IHost host)
    {
        using var scope = host.Services.CreateScope();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

        // Opsiyonel: Seed:TruncateUsersOnStartup=true ise tüm kullanıcılar temizlenir
        // (sadece sıfırdan kurulum/test senaryoları için).
        var truncateUsers = config.GetValue("Seed:TruncateUsersOnStartup", false);
        if (truncateUsers)
        {
            logger.LogWarning("Seed: Tüm kullanıcılar ve refresh token'lar siliniyor...");
            await db.Database.ExecuteSqlRawAsync("DELETE FROM refresh_tokens;");
            await db.Database.ExecuteSqlRawAsync("DELETE FROM \"AspNetUserRoles\";");
            await db.Database.ExecuteSqlRawAsync(
                "UPDATE map_points SET \"CreatedByUserId\" = NULL WHERE \"CreatedByUserId\" IS NOT NULL;");
            await db.Database.ExecuteSqlRawAsync("DELETE FROM \"AspNetUsers\";");
        }

        // Roller (Admin/User) — yoksa eklenir.
        foreach (var roleName in new[] { "Admin", "User" })
        {
            if (!await roleManager.RoleExistsAsync(roleName))
                await roleManager.CreateAsync(new IdentityRole<Guid> { Name = roleName });
        }

        // Varsayılan admin: 'admin' / 'admin' — UserManager.CreateAsync ile
        // BCrypt benzeri Identity hash'i otomatik üretilir, ham şifre DB'de tutulmaz.
        const string adminUserName = "admin";
        const string adminPassword = "admin";

        if (await userManager.FindByNameAsync(adminUserName) is null)
        {
            var admin = new ApplicationUser
            {
                UserName = adminUserName,
                Email = "admin@basarsoft.local",
                DisplayName = "Sistem Yöneticisi",
            };
            var result = await userManager.CreateAsync(admin, adminPassword);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(admin, "Admin");
                logger.LogInformation("Varsayılan admin kullanıcısı oluşturuldu (şifre hash'lenerek kaydedildi).");
            }
            else
            {
                logger.LogError("Admin oluşturulamadı: {Errors}",
                    string.Join(", ", result.Errors.Select(e => e.Description)));
            }
        }
    }
}
