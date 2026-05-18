using BasarsoftOdev.BLL.Dtos;

namespace BasarsoftOdev.BLL.Interfaces;

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryDto>> ListAsync(CancellationToken cancellationToken = default);
    Task<CategoryDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<CategoryDto> CreateAsync(CategoryCreateDto dto, CancellationToken cancellationToken = default);
    Task<CategoryDto?> UpdateAsync(int id, CategoryUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
