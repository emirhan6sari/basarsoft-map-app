using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Dtos;
using BasarsoftOdev.BLL.Exceptions;
using BasarsoftOdev.BLL.Interfaces;
using BasarsoftOdev.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace BasarsoftOdev.BLL.Services;

/// <summary>Kategori tanımları; ad/sıra çakışması ve silme öncesi kullanım kontrolü.</summary>
public class CategoryService : ICategoryService
{
    private readonly ICategoryQueryRepository _queries;
    private readonly ICategoryCommandRepository _commands;
    private readonly IMapPointCategoryLinkRepository _mapPointLinks;
    private readonly ILogger<CategoryService> _logger;
    private readonly IAppLogWriter _appLogWriter;

    public CategoryService(
        ICategoryQueryRepository queries,
        ICategoryCommandRepository commands,
        IMapPointCategoryLinkRepository mapPointLinks,
        ILogger<CategoryService> logger,
        IAppLogWriter appLogWriter)
    {
        _queries = queries;
        _commands = commands;
        _mapPointLinks = mapPointLinks;
        _logger = logger;
        _appLogWriter = appLogWriter;
    }

    public async Task<IReadOnlyList<CategoryDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        var cats = await _queries.GetAllAsync(cancellationToken);
        return cats.Select(ToDto).ToList();
    }

    public async Task<CategoryDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var entity = await _queries.GetByIdAsync(id, cancellationToken);
        return entity is null ? null : ToDto(entity);
    }

    public async Task<CategoryDto> CreateAsync(CategoryCreateDto dto, CancellationToken cancellationToken = default)
    {
        var name = dto.Name.Trim();
        if (await _queries.FindByNameAsync(name, cancellationToken) is not null)
            throw new BusinessException(ErrorCodes.Conflict, "Bu kategori adı zaten kayıtlı.", statusCode: 409);

        await EnsureSortOrderAvailableAsync(dto.SortOrder, excludeId: null, cancellationToken);

        var entity = new Category
        {
            Name = name,
            DisplayName = string.IsNullOrWhiteSpace(dto.DisplayName) ? name : dto.DisplayName.Trim(),
            SortOrder = dto.SortOrder,
        };

        await _commands.AddAsync(entity, cancellationToken);
        _logger.LogInformation("Kategori oluşturuldu: {Id} ({Name})", entity.Id, entity.Name);
        await _appLogWriter.WriteAsync(new AppLogEntry(
            "Information",
            $"Kategori oluşturuldu: {entity.Id} ({entity.Name})",
            SourceContext: nameof(CategoryService),
            Properties: new Dictionary<string, object?> { ["Id"] = entity.Id, ["Name"] = entity.Name }),
            cancellationToken);

        return ToDto(entity);
    }

    public async Task<CategoryDto?> UpdateAsync(int id, CategoryUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await _queries.GetByIdAsync(id, cancellationToken);
        if (entity is null) return null;

        var newName = dto.Name.Trim();
        var existing = await _queries.FindByNameAsync(newName, cancellationToken);
        if (existing is not null && existing.Id != id)
            throw new BusinessException(ErrorCodes.Conflict, "Bu kategori adı zaten kayıtlı.", statusCode: 409);

        await EnsureSortOrderAvailableAsync(dto.SortOrder, excludeId: id, cancellationToken);

        var oldName = entity.Name;
        entity.Name = newName;
        entity.DisplayName = string.IsNullOrWhiteSpace(dto.DisplayName) ? newName : dto.DisplayName.Trim();
        entity.SortOrder = dto.SortOrder;

        await _commands.UpdateAsync(entity, cancellationToken);

        if (!string.Equals(oldName, newName, StringComparison.Ordinal))
            await _mapPointLinks.RenameMapPointsCategoryAsync(oldName, newName, cancellationToken);

        _logger.LogInformation("Kategori güncellendi: {Id} ({Name})", entity.Id, entity.Name);
        await _appLogWriter.WriteAsync(new AppLogEntry(
            "Information",
            $"Kategori güncellendi: {entity.Id} ({entity.Name})",
            SourceContext: nameof(CategoryService),
            Properties: new Dictionary<string, object?> { ["Id"] = entity.Id, ["Name"] = entity.Name }),
            cancellationToken);

        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var entity = await _queries.GetByIdAsync(id, cancellationToken);
        if (entity is null) return false;

        var inUse = await _mapPointLinks.CountMapPointsByCategoryNameAsync(entity.Name, cancellationToken);
        if (inUse > 0)
        {
            throw new BusinessException(
                ErrorCodes.Conflict,
                $"Kategori silinemez: {inUse} harita noktası bu kategoriyi kullanıyor.",
                statusCode: 409);
        }

        await _commands.DeleteAsync(entity, cancellationToken);
        _logger.LogInformation("Kategori silindi: {Id} ({Name})", entity.Id, entity.Name);
        await _appLogWriter.WriteAsync(new AppLogEntry(
            "Information",
            $"Kategori silindi: {entity.Id} ({entity.Name})",
            SourceContext: nameof(CategoryService),
            Properties: new Dictionary<string, object?> { ["Id"] = entity.Id, ["Name"] = entity.Name }),
            cancellationToken);

        return true;
    }

    private async Task EnsureSortOrderAvailableAsync(int sortOrder, int? excludeId, CancellationToken cancellationToken)
    {
        var taken = await _queries.FindBySortOrderAsync(sortOrder, cancellationToken);
        if (taken is null || (excludeId.HasValue && taken.Id == excludeId.Value))
            return;

        var label = taken.DisplayName ?? taken.Name;
        throw new BusinessException(
            ErrorCodes.Conflict,
            $"Sıra numarası {sortOrder} zaten \"{label}\" kategorisinde kullanılıyor.",
            statusCode: 409);
    }

    private static CategoryDto ToDto(Category c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        DisplayName = c.DisplayName ?? c.Name,
        SortOrder = c.SortOrder,
    };
}
