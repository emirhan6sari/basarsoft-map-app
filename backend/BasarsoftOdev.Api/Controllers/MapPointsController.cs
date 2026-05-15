using System.Security.Claims;
using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Dtos;
using BasarsoftOdev.BLL.Exceptions;
using BasarsoftOdev.BLL.Interfaces;
using FluentValidation;
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
    private readonly IValidator<MapPointBBoxDto> _bboxValidator;

    public MapPointsController(IMapPointService service, IValidator<MapPointBBoxDto> bboxValidator)
    {
        _service = service;
        _bboxValidator = bboxValidator;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("Kullanıcı kimliği alınamadı."));

    private bool IsAdmin => User.IsInRole("Admin");

    [HttpGet]
    [Authorize(Roles = "Admin,User")]
    [ProducesResponseType(typeof(ApiResponse<MapPointListResultDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<MapPointListResultDto>>> GetAll(
        [FromQuery] double? minLon,
        [FromQuery] double? minLat,
        [FromQuery] double? maxLon,
        [FromQuery] double? maxLat,
        [FromQuery] int? limit,
        CancellationToken ct)
    {
        MapPointBBoxDto? bbox = null;
        var hasAny = minLon.HasValue || minLat.HasValue || maxLon.HasValue || maxLat.HasValue;
        if (hasAny)
        {
            if (!minLon.HasValue || !minLat.HasValue || !maxLon.HasValue || !maxLat.HasValue)
            {
                throw new BusinessException(
                    ErrorCodes.Validation,
                    "BBox filtresi için minLon, minLat, maxLon ve maxLat birlikte gönderilmelidir.");
            }

            bbox = new MapPointBBoxDto
            {
                MinLongitude = minLon.Value,
                MinLatitude = minLat.Value,
                MaxLongitude = maxLon.Value,
                MaxLatitude = maxLat.Value,
            };

            var validation = await _bboxValidator.ValidateAsync(bbox, ct);
            if (!validation.IsValid)
            {
                throw new ValidationException(validation.Errors);
            }
        }

        if (limit is < 1)
            throw new BusinessException(ErrorCodes.Validation, "limit en az 1 olmalıdır.");

        var result = await _service.ListAsync(CurrentUserId, IsAdmin, bbox, limit, ct);
        return Ok(ApiResponse<MapPointListResultDto>.Ok(result, HttpContext.TraceIdentifier));
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

    [HttpPost("import")]
    [Authorize(Roles = "Admin,User")]
    [ProducesResponseType(typeof(ApiResponse<MapPointImportResultDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<MapPointImportResultDto>>> Import(
        [FromBody] MapPointImportRequestDto dto,
        CancellationToken ct)
    {
        var result = await _service.ImportAsync(dto, CurrentUserId, ct);
        return Ok(ApiResponse<MapPointImportResultDto>.Ok(result, HttpContext.TraceIdentifier));
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
