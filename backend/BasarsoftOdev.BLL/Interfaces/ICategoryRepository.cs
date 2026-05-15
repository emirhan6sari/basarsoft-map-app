using BasarsoftOdev.Domain.Entities;

namespace BasarsoftOdev.BLL.Interfaces;

public interface ICategoryRepository
{
    Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken cancellationToken = default);
}
