using BasarsoftOdev.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BasarsoftOdev.Api.Data;

/// <summary>
/// Uygulamanın <b>tek</b> EF Core DbContext'i.
/// Veritabanına yapılacak tüm sorgular bu sınıf üzerinden geçer.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // -----------------------------------------------------------------------
    // DbSet'ler — her DbSet bir tablo. EF Core, set'leri OnModelCreating
    // içindeki konfigürasyonla birlikte değerlendirip migration üretiyor.
    // -----------------------------------------------------------------------

    /// <summary>Kullanıcının haritaya eklediği nokta kayıtları (CRUD).</summary>
    public DbSet<MapPoint> MapPoints => Set<MapPoint>();

    /// <summary>
    /// Model yapılandırması (fluent API). Tablo isimleri, sütun tipleri,
    /// indeksler ve mekansal sütun ayarları (SRID vb.) burada yapılır.
    /// </summary>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // PostGIS eklentisi: migration uygulandığında DB'de yoksa kurulur.
        modelBuilder.HasPostgresExtension("postgis");

        // -------------------------------------------------------------------
        // MapPoint entity konfigürasyonu
        // -------------------------------------------------------------------
        modelBuilder.Entity<MapPoint>(entity =>
        {
            // PostgreSQL/Postgres tablo adı snake_case olsun ki SQL tarafında
            // double-quote'a ihtiyaç duymadan rahat sorgulayabilelim.
            entity.ToTable("map_points");

            entity.HasKey(p => p.Id);

            entity.Property(p => p.Name)
                  .IsRequired()
                  .HasMaxLength(200);

            // Numara / Kod — zorunlu, kısa. Şimdilik UNIQUE yok; sonra
            // iş kuralı netleşince HasIndex(...).IsUnique() eklenebilir.
            entity.Property(p => p.Number)
                  .IsRequired()
                  .HasMaxLength(50);

            entity.Property(p => p.Description)
                  .HasMaxLength(2000);

            // Category: enum'ı DB'ye string olarak yazıyoruz. Sayı yerine
            // string saklamak SQL üzerinden bakarken çok daha okunur.
            entity.Property(p => p.Category)
                  .IsRequired()
                  .HasConversion<string>()
                  .HasMaxLength(32);

            // EN KRİTİK KISIM:
            // Location alanı PostGIS'in geometry(Point, 4326) tipiyle saklanacak.
            // Bu sayede DB seviyesinde projeksiyon karışıklığı yaşanmaz ve
            // mekansal sorgular (ST_DWithin, ST_Within, ST_Buffer...) doğru SRID
            // ile çalışır. Frontend zaten 4326'da çalıştığı için ekstra dönüşüm
            // gerekmez.
            entity.Property(p => p.Location)
                  .HasColumnType("geometry(Point, 4326)")
                  .IsRequired();

            // GIST indeksi mekansal aramalar için kritik. Frontend ilerleyen
            // adımlarda buffer/rectangle/polygon ile sorgu atacak; bu indeks
            // olmadan bu sorgular tüm tabloyu tarar.
            entity.HasIndex(p => p.Location)
                  .HasMethod("gist");

            // Zaman damgaları "timestamp with time zone" olarak saklanır.
            entity.Property(p => p.CreatedAt)
                  .HasColumnType("timestamptz")
                  .IsRequired();

            entity.Property(p => p.UpdatedAt)
                  .HasColumnType("timestamptz")
                  .IsRequired();
        });

        base.OnModelCreating(modelBuilder);
    }
}
