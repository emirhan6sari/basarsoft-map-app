using Microsoft.EntityFrameworkCore;

namespace BasarsoftOdev.Api.Data;

/// <summary>
/// Uygulamanın <b>tek</b> EF Core DbContext'i.
/// Veritabanına yapılacak tüm sorgular bu sınıf üzerinden geçer.
/// </summary>
/// <remarks>
/// <para>
/// Entity'ler (örn. <c>MapPoint</c>) bir sonraki adımda eklendiğinde,
/// <c>DbSet&lt;T&gt;</c> property'leri ve <c>OnModelCreating</c> içinde
/// konfigürasyonları buraya eklenecek.
/// </para>
/// <para>
/// DI container'a <c>Program.cs</c> içinde <c>AddDbContext&lt;AppDbContext&gt;</c>
/// ile kaydedilir; PostgreSQL ve PostGIS (NetTopologySuite) sağlayıcılarıyla
/// yapılandırılır.
/// </para>
/// </remarks>
public class AppDbContext : DbContext
{
    /// <summary>
    /// Constructor — EF Core'un standart pattern'i. Options DI üzerinden
    /// enjekte edilir.
    /// </summary>
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // -----------------------------------------------------------------------
    // DbSet'ler buraya gelecek (bir sonraki adımda):
    //   public DbSet<MapPoint> MapPoints => Set<MapPoint>();
    // -----------------------------------------------------------------------

    /// <summary>
    /// Model yapılandırması (fluent API). Burada tablo isimleri, ilişkiler,
    /// indeksler ve mekansal sütunlar konfigüre edilecek.
    /// </summary>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // PostGIS eklentisinin EF Core migration tarafından oluşturulan
        // veritabanlarında otomatik aktif olmasını sağlar. Yerelde elle de
        // çalıştırdık ama bu satır taşınabilirlik (örn. Railway PostgreSQL)
        // için kritik.
        modelBuilder.HasPostgresExtension("postgis");

        base.OnModelCreating(modelBuilder);
    }
}
