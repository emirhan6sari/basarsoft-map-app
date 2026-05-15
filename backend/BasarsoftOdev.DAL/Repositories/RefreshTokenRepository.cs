using BasarsoftOdev.BLL.Interfaces;
using BasarsoftOdev.DAL.Data;
using BasarsoftOdev.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BasarsoftOdev.DAL.Repositories;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly AppDbContext _db;

    public RefreshTokenRepository(AppDbContext db) => _db = db;

    public Task<RefreshToken?> GetByTokenAsync(string token, CancellationToken cancellationToken = default)
        => _db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == token, cancellationToken);

    public async Task AddAsync(RefreshToken token, CancellationToken cancellationToken = default)
    {
        await _db.RefreshTokens.AddAsync(token, cancellationToken);
    }

    public Task RevokeAsync(RefreshToken token, string? replacedBy = null, CancellationToken cancellationToken = default)
    {
        token.RevokedAt = DateTime.UtcNow;
        token.ReplacedByToken = replacedBy;
        _db.RefreshTokens.Update(token);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        => _db.SaveChangesAsync(cancellationToken);
}
