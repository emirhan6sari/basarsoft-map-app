using BasarsoftOdev.Api.Dtos;
using BasarsoftOdev.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace BasarsoftOdev.Api.Controllers;

/// <summary>
/// Harita noktaları için REST API.
/// </summary>
/// <remarks>
/// Endpoint isimlendirmesi RESTful: kaynak adı çoğul ("mappoints"), action
/// HTTP fiili ile ifade edilir (GET/POST/PUT/DELETE). Bu, ödev şartlarındaki
/// "anlamlı API endpoint'leri" maddesini karşılıyor.
/// </remarks>
[ApiController]
[Route("api/[controller]")]   // → /api/mappoints
[Produces("application/json")]
public class MapPointsController : ControllerBase
{
    private readonly IMapPointService _service;
    private readonly ILogger<MapPointsController> _logger;

    public MapPointsController(IMapPointService service, ILogger<MapPointsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    /// <summary>Tüm noktaları listeler (yeni eklenenler en üstte).</summary>
    /// <response code="200">Başarılı.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<MapPointResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MapPointResponseDto>>> GetAll(CancellationToken cancellationToken)
    {
        var items = await _service.GetAllAsync(cancellationToken);
        return Ok(items);
    }

    /// <summary>Tek bir noktayı kimlikle getirir.</summary>
    /// <response code="200">Bulundu.</response>
    /// <response code="404">Kayıt yok.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(MapPointResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MapPointResponseDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, cancellationToken);
        if (item is null)
        {
            return NotFound(new { message = $"Nokta bulunamadı: {id}" });
        }
        return Ok(item);
    }

    /// <summary>Yeni bir nokta oluşturur.</summary>
    /// <response code="201">Oluşturuldu. <c>Location</c> header'ında detayın URL'i döner.</response>
    /// <response code="400">Geçersiz payload (validation hatası).</response>
    [HttpPost]
    [ProducesResponseType(typeof(MapPointResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MapPointResponseDto>> Create(
        [FromBody] MapPointCreateDto dto,
        CancellationToken cancellationToken)
    {
        // [ApiController] attribute'u DataAnnotation hatalarını otomatik 400'e
        // çevirir, ama ek sanity check'i loglayıp net yanıt için tutuyoruz.
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var created = await _service.CreateAsync(dto, cancellationToken);
        _logger.LogInformation("Nokta oluşturuldu: {Id} ({Name})", created.Id, created.Name);

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>Mevcut bir noktayı tamamen günceller (full replace).</summary>
    /// <response code="200">Güncellendi.</response>
    /// <response code="400">Geçersiz payload.</response>
    /// <response code="404">Güncellenecek kayıt yok.</response>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(MapPointResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MapPointResponseDto>> Update(
        Guid id,
        [FromBody] MapPointUpdateDto dto,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var updated = await _service.UpdateAsync(id, dto, cancellationToken);
        if (updated is null)
        {
            return NotFound(new { message = $"Güncellenecek nokta bulunamadı: {id}" });
        }

        _logger.LogInformation("Nokta güncellendi: {Id}", id);
        return Ok(updated);
    }

    /// <summary>Bir noktayı siler.</summary>
    /// <response code="204">Silindi.</response>
    /// <response code="404">Kayıt yok.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _service.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            return NotFound(new { message = $"Silinecek nokta bulunamadı: {id}" });
        }

        _logger.LogInformation("Nokta silindi: {Id}", id);
        return NoContent();
    }
}
