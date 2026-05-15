using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Dtos;
using BasarsoftOdev.BLL.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace BasarsoftOdev.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryRepository _repo;

    public CategoriesController(ICategoryRepository repo) => _repo = repo;

    /// <summary>Tüm kategorileri döner — auth gerekmez (frontend dropdown için).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<CategoryDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CategoryDto>>>> GetAll(CancellationToken ct)
    {
        var cats = await _repo.GetAllAsync(ct);
        var dtos = cats.Select(c => new CategoryDto
        {
            Id = c.Id,
            Name = c.Name,
            DisplayName = c.DisplayName ?? c.Name,
            SortOrder = c.SortOrder,
        }).ToList();
        return Ok(ApiResponse<IReadOnlyList<CategoryDto>>.Ok(dtos, HttpContext.TraceIdentifier));
    }
}
