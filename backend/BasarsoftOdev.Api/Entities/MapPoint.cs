using NetTopologySuite.Geometries;

namespace BasarsoftOdev.Api.Entities;

/// <summary>
/// Harita üzerinde kullanıcı tarafından eklenen bir nokta (POI).
/// Veritabanında <c>map_points</c> tablosuna karşılık gelir.
/// </summary>
/// <remarks>
/// <para>
/// <see cref="Location"/> alanı PostGIS'in <c>geometry(Point, 4326)</c>
/// tipinde saklanır. SRID 4326 (WGS 84 / lon-lat) seçilmesinin nedeni:
/// frontend (OpenLayers) zaten EPSG:4326 ile çalışıyor; böylece her okuma/yazmada
/// projeksiyon dönüşümü yapmamıza gerek kalmıyor.
/// </para>
/// <para>
/// SRID konfigürasyonu <see cref="Data.AppDbContext.OnModelCreating"/> içinde
/// fluent API ile yapılır; bu sayede entity sınıfı tüm projeksiyon detaylarından
/// bağımsız kalır.
/// </para>
/// </remarks>
public class MapPoint
{
    /// <summary>
    /// Birincil anahtar. GUID kullanıyoruz çünkü:
    /// (a) frontend'in optimistik UI için kimliği önceden üretmesi mümkün olabilir,
    /// (b) ileride başka bir DB'ye taşınırken merge çakışmaları yaşamayız.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Noktayı insan-dostu şekilde tanımlayan başlık.
    /// (Örn: "İstanbul Ofis", "Mola Noktası").
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Numara / Kod — iş tarafında noktayı kısa ve benzersiz şekilde tanımlar
    /// (örn. "DEP-001", "BAYI-42"). Şu an benzersizlik zorlanmıyor; iş kuralı
    /// netleşince UNIQUE indeks eklenebilir.
    /// </summary>
    public string Number { get; set; } = string.Empty;

    /// <summary>
    /// Opsiyonel açıklama. Notlar, tag'ler vs.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// İş tarafında nokta türü. DB'de string olarak saklanır.
    /// </summary>
    public MapPointCategory Category { get; set; } = MapPointCategory.Depo;

    /// <summary>
    /// Noktanın coğrafi konumu. EPSG:4326 (lon, lat) cinsinden.
    /// </summary>
    /// <remarks>
    /// NetTopologySuite'in <see cref="Point"/> tipi kullanılır.
    /// X = longitude, Y = latitude (NTS konvansiyonu).
    /// </remarks>
    public Point Location { get; set; } = default!;

    /// <summary>
    /// Kayıt zamanı (UTC). DB tarafında <c>timestamptz</c> olarak saklanır.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Son güncelleme zamanı (UTC). Her PUT çağrısında ayarlanır.
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
