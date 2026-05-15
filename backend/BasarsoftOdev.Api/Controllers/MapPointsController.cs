using System.Security.Claims;
using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Dtos;
using BasarsoftOdev.BLL.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BasarsoftOdev.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Produces("application/json")]
public class MapPointsController : ControllerBase
{
    private readonly IMapPointService _service;

    public MapPointsController(IMapPointService service) => _service = service;

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("Kullanıcı kimliği alınamadı."));

    private bool IsAdmin => User.IsInRole("Admin");

    [HttpGet]
    [Authorize(Roles = "Admin,User")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<MapPointResponseDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<MapPointResponseDto>>>> GetAll(CancellationToken ct)
    {
        var items = await _service.GetAllAsync(CurrentUserId, IsAdmin, ct);
        return Ok(ApiResponse<IReadOnlyList<MapPointResponseDto>>.Ok(items, HttpContext.TraceIdentifier));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,User")]
    public async Task<ActionResult<ApiResponse<MapPointResponseDto>>> GetById(Guid id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, CurrentUserId, IsAdmin, ct);
        if (item is null)
            return NotFound(ApiResponse<MapPointResponseDto>.Fail(ErrorCodes.NotFound, $"Nokta bulunamadı: {id}", HttpContext.TraceIdentifier));
        return Ok(ApiResponse<MapPointResponseDto>.Ok(item, HttpContext.TraceIdentifier));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,User")]
    [ProducesResponseType(typeof(ApiResponse<MapPointResponseDto>), StatusCodes.Status201Created)]
    public async Task<ActionResult<ApiResponse<MapPointResponseDto>>> Create([FromBody] MapPointCreateDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, CurrentUserId, ct);
        return CreatedAtAction(
            nameof(GetById),
            new { id = created.Id },
            ApiResponse<MapPointResponseDto>.Ok(created, HttpContext.TraceIdentifier));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,User")]
    public async Task<ActionResult<ApiResponse<MapPointResponseDto>>> Update(Guid id, [FromBody] MapPointUpdateDto dto, CancellationToken ct)
    {
        var updated = await _service.UpdateAsync(id, dto, CurrentUserId, IsAdmin, ct);
        if (updated is null)
            return NotFound(ApiResponse<MapPointResponseDto>.Fail(ErrorCodes.NotFound, $"Güncellenecek nokta yok: {id}", HttpContext.TraceIdentifier));
        return Ok(ApiResponse<MapPointResponseDto>.Ok(updated, HttpContext.TraceIdentifier));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,User")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var deleted = await _service.DeleteAsync(id, CurrentUserId, IsAdmin, ct);
        if (!deleted)
            return NotFound(ApiResponse<object>.Fail(ErrorCodes.NotFound, $"Silinecek nokta yok: {id}", HttpContext.TraceIdentifier));
        return NoContent();
    }
}
