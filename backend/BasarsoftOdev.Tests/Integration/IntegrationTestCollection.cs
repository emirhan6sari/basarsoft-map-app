namespace BasarsoftOdev.Tests.Integration;

/// <summary>
/// Tüm integration testler tek WebApplicationFactory örneği paylaşır (InMemory DB ve seed tutarlılığı).
/// </summary>
[CollectionDefinition(Name)]
public sealed class IntegrationTestCollection : ICollectionFixture<CustomWebApplicationFactory>
{
    public const string Name = "IntegrationTests";
}
