using BasarsoftOdev.BLL.Interfaces;
using BasarsoftOdev.DAL.Data;
using BasarsoftOdev.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BasarsoftOdev.DAL.Repositories;

public class CategoryRepository : ICategoryRepository
{
    private readonly AppDbContext _db;
    public CategoryRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken cancellationToken = default)
        => await _db.Categories.AsNoTracking().OrderBy(c => c.SortOrder).ToListAsync(cancellationToken);
}
