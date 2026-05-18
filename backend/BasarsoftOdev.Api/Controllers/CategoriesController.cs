using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Dtos;
using BasarsoftOdev.BLL.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BasarsoftOdev.Api.Controllers;

/// <summary>
/// Kategori CRUD. Liste herkese açık; yazma işlemleri yalnızca Admin rolünde.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _service;

    public CategoriesController(ICategoryService service) => _service = service;

    /// <summary>Tüm kategorileri döner (dropdown / legend).</summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<CategoryDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CategoryDto>>>> GetAll(CancellationToken ct)
    {
        var dtos = await _service.ListAsync(ct);
        return Ok(ApiResponse<IReadOnlyList<CategoryDto>>.Ok(dtos, HttpContext.TraceIdentifier));
    }

    /// <summary>Admin — kategori yönetim ekranı için tekil kayıt.</summary>
    [HttpGet("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<CategoryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object?>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> GetById(int id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, ct);
        if (item is null)
            return NotFound(ApiResponse<CategoryDto>.Fail(ErrorCodes.NotFound, $"Kategori bulunamadı: {id}", HttpContext.TraceIdentifier));
        return Ok(ApiResponse<CategoryDto>.Ok(item, HttpContext.TraceIdentifier));
    }

    /// <summary>Sıra numarası benzersiz olmalıdır (409).</summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<CategoryDto>), StatusCodes.Status201Created)]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> Create([FromBody] CategoryCreateDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(
            nameof(GetById),
            new { id = created.Id },
            ApiResponse<CategoryDto>.Ok(created, HttpContext.TraceIdentifier));
    }

    /// <summary>Ad değişirse ilgili map_points.Category alanları da güncellenir.</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<CategoryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object?>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> Update(int id, [FromBody] CategoryUpdateDto dto, CancellationToken ct)
    {
        var updated = await _service.UpdateAsync(id, dto, ct);
        if (updated is null)
            return NotFound(ApiResponse<CategoryDto>.Fail(ErrorCodes.NotFound, $"Kategori bulunamadı: {id}", HttpContext.TraceIdentifier));
        return Ok(ApiResponse<CategoryDto>.Ok(updated, HttpContext.TraceIdentifier));
    }

    /// <summary>Kullanımda olan kategori silinemez (409).</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object?>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var deleted = await _service.DeleteAsync(id, ct);
        if (!deleted)
            return NotFound(ApiResponse<object?>.Fail(ErrorCodes.NotFound, $"Kategori bulunamadı: {id}", HttpContext.TraceIdentifier));
        return NoContent();
    }
}
