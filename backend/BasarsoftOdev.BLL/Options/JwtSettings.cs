namespace BasarsoftOdev.BLL.Options;

public class JwtSettings
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "BasarsoftMapApi";
    public string Audience { get; set; } = "BasarsoftMapClient";
    public string SecretKey { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 60;
    public int RefreshTokenDays { get; set; } = 7;
}
