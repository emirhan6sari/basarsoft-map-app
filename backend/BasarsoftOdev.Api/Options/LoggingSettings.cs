namespace BasarsoftOdev.Api.Options;

public class LoggingSettings
{
    public const string SectionName = "Logging";

    /// <summary>Bu süreyi aşan istekler Warning ile loglanır (ms).</summary>
    public int SlowRequestThresholdMs { get; set; } = 2000;

    /// <summary>İstek başlangıç/bitiş logu atlanacak path önekleri.</summary>
    public string[] SkipPathPrefixes { get; set; } =
    [
        "/swagger",
        "/health",
        "/favicon",
    ];
}
