namespace BasarsoftOdev.Api.Entities;

/// <summary>
/// Bir noktanın iş anlamında türünü belirten kategori.
/// </summary>
/// <remarks>
/// Ödev şartlarında örnek olarak verilen 4 kategori. Veritabanına string olarak
/// yazılır (HasConversion, <see cref="Data.AppDbContext"/> içinde); böylece
/// SQL tarafından kolay okunur, yeni değer eklemek de geriye uyumlu olur.
/// </remarks>
public enum MapPointCategory
{
    /// <summary>Depo / lojistik tesisi.</summary>
    Depo,

    /// <summary>Bayi / satış noktası.</summary>
    Bayi,

    /// <summary>Müşteri lokasyonu.</summary>
    Musteri,

    /// <summary>Ofis / merkez.</summary>
    Ofis,
}
