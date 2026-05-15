using Microsoft.AspNetCore.Identity;

namespace BasarsoftOdev.DAL.Identity;

/// <summary>ASP.NET Identity varsayılan İngilizce hata metinlerini Türkçeleştirir.</summary>
public class TurkishIdentityErrorDescriber : IdentityErrorDescriber
{
    public override IdentityError PasswordTooShort(int length) =>
        new() { Code = nameof(PasswordTooShort), Description = $"Şifre en az {length} karakter olmalıdır." };

    public override IdentityError PasswordRequiresNonAlphanumeric() =>
        new() { Code = nameof(PasswordRequiresNonAlphanumeric), Description = "Şifre en az bir özel karakter içermelidir (!, @, #, vb.)." };

    public override IdentityError PasswordRequiresDigit() =>
        new() { Code = nameof(PasswordRequiresDigit), Description = "Şifre en az bir rakam (0-9) içermelidir." };

    public override IdentityError PasswordRequiresLower() =>
        new() { Code = nameof(PasswordRequiresLower), Description = "Şifre en az bir küçük harf (a-z) içermelidir." };

    public override IdentityError PasswordRequiresUpper() =>
        new() { Code = nameof(PasswordRequiresUpper), Description = "Şifre en az bir büyük harf (A-Z) içermelidir." };

    public override IdentityError PasswordRequiresUniqueChars(int uniqueChars) =>
        new() { Code = nameof(PasswordRequiresUniqueChars), Description = $"Şifre en az {uniqueChars} farklı karakter içermelidir." };

    public override IdentityError DuplicateUserName(string userName) =>
        new() { Code = nameof(DuplicateUserName), Description = "Bu kullanıcı adı zaten kullanılıyor." };

    public override IdentityError DuplicateEmail(string email) =>
        new() { Code = nameof(DuplicateEmail), Description = "Bu e-posta adresi zaten kayıtlı." };

    public override IdentityError InvalidUserName(string? userName) =>
        new() { Code = nameof(InvalidUserName), Description = "Kullanıcı adı geçersiz. Yalnızca harf, rakam ve _ kullanılabilir." };
}
