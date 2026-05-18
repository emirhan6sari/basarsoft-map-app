using BasarsoftOdev.Domain.Entities;

namespace BasarsoftOdev.BLL.Interfaces;

/// <summary>Kategori yazma işlemleri (ISP).</summary>
public interface ICategoryCommandRepository
{
    Task<Category> AddAsync(Category entity, CancellationToken cancellationToken = default);
    Task UpdateAsync(Category entity, CancellationToken cancellationToken = default);
    Task DeleteAsync(Category entity, CancellationToken cancellationToken = default);
}
