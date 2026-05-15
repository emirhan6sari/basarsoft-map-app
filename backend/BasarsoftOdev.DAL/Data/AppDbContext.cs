using BasarsoftOdev.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BasarsoftOdev.DAL.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<MapPoint> MapPoints => Set<MapPoint>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Category> Categories => Set<Category>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Kullanılmayan Identity tablolarını yoksay
        modelBuilder.Ignore<IdentityUserClaim<Guid>>();
        modelBuilder.Ignore<IdentityRoleClaim<Guid>>();
        modelBuilder.Ignore<IdentityUserLogin<Guid>>();
        modelBuilder.Ignore<IdentityUserToken<Guid>>();

        modelBuilder.Entity<MapPoint>(entity =>
        {
            entity.ToTable("map_points");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).IsRequired().HasMaxLength(200);
            entity.Property(p => p.Number).IsRequired().HasMaxLength(50);
            entity.Property(p => p.Description).HasMaxLength(2000);
            entity.Property(p => p.Category).IsRequired().HasMaxLength(32);
            entity.HasIndex(p => new { p.XMercator, p.YMercator });
            entity.HasIndex(p => new { p.Longitude, p.Latitude });
            entity.Property(p => p.CreatedAt).HasColumnType("timestamptz").IsRequired();
            entity.Property(p => p.IsDeleted).HasDefaultValue(false);
            entity.Property(p => p.DeletedAt).HasColumnType("timestamptz");
            entity.HasIndex(p => p.IsDeleted);
            entity.HasQueryFilter(p => !p.IsDeleted);
            entity.HasOne(p => p.CreatedBy)
                .WithMany()
                .HasForeignKey(p => p.CreatedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Token).IsRequired().HasMaxLength(512);
            entity.HasIndex(t => t.Token).IsUnique();
            entity.HasOne(t => t.User).WithMany(u => u.RefreshTokens).HasForeignKey(t => t.UserId);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Name).IsRequired().HasMaxLength(64);
            entity.Property(c => c.DisplayName).HasMaxLength(128);
            entity.HasData(
                new Category { Id = 1, Name = "Depo",    DisplayName = "Depo",    SortOrder = 1 },
                new Category { Id = 2, Name = "Bayi",    DisplayName = "Bayi",    SortOrder = 2 },
                new Category { Id = 3, Name = "Musteri", DisplayName = "Müşteri", SortOrder = 3 },
                new Category { Id = 4, Name = "Ofis",    DisplayName = "Ofis",    SortOrder = 4 }
            );
        });

        // Roller DB'de yönetilir — HasData değil, SeedDatabaseAsync üzerinden
        modelBuilder.Entity<IdentityRole<Guid>>().HasData(
            new IdentityRole<Guid>
            {
                Id = new Guid("00000000-0000-0000-0000-000000000001"),
                Name = "Admin",
                NormalizedName = "ADMIN",
                ConcurrencyStamp = "00000000-0000-0000-0000-000000000001",
            },
            new IdentityRole<Guid>
            {
                Id = new Guid("00000000-0000-0000-0000-000000000002"),
                Name = "User",
                NormalizedName = "USER",
                ConcurrencyStamp = "00000000-0000-0000-0000-000000000002",
            }
        );
    }
}
