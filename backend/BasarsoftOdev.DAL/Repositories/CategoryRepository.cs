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
        => await _db.Categories.AsNoTracking().OrderBy(c => c.SortOrder).ThenBy(c => c.Name).ToListAsync(cancellationToken);

    public Task<Category?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        => _db.Categories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public Task<Category?> FindByNameAsync(string name, CancellationToken cancellationToken = default)
        => _db.Categories.FirstOrDefaultAsync(
            c => c.Name.ToLower() == name.Trim().ToLower(),
            cancellationToken);

    /// <summary>Sıra çakışması kontrolü (oluşturma / güncelleme).</summary>
    public Task<Category?> FindBySortOrderAsync(int sortOrder, CancellationToken cancellationToken = default)
        => _db.Categories.FirstOrDefaultAsync(c => c.SortOrder == sortOrder, cancellationToken);

    public async Task<Category> AddAsync(Category entity, CancellationToken cancellationToken = default)
    {
        _db.Categories.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task UpdateAsync(Category entity, CancellationToken cancellationToken = default)
    {
        _db.Categories.Update(entity);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Category entity, CancellationToken cancellationToken = default)
    {
        _db.Categories.Remove(entity);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public Task<int> CountMapPointsByCategoryNameAsync(string categoryName, CancellationToken cancellationToken = default)
        => _db.MapPoints.IgnoreQueryFilters()
            .CountAsync(p => p.Category == categoryName && !p.IsDeleted, cancellationToken);

    public async Task RenameMapPointsCategoryAsync(string oldName, string newName, CancellationToken cancellationToken = default)
    {
        await _db.MapPoints
            .Where(p => p.Category == oldName)
            .ExecuteUpdateAsync(
                s => s.SetProperty(p => p.Category, newName),
                cancellationToken);
    }
}
