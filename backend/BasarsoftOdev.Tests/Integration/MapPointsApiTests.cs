using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Dtos;
using FluentAssertions;

namespace BasarsoftOdev.Tests.Integration;

[Collection(IntegrationTestCollection.Name)]
public class MapPointsApiTests
{
    private readonly HttpClient _client;

    public MapPointsApiTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetMapPoints_WithoutAuth_Returns401()
    {
        var response = await _client.GetAsync("/api/MapPoints");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateAndList_WithBbox_ReturnsPoint()
    {
        var token = await LoginAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var create = new MapPointCreateDto
        {
            Name = "Test Nokta",
            Number = "INT-001",
            Category = "Depo",
            Longitude = 32.85,
            Latitude = 39.92,
        };

        var createResponse = await _client.PostAsJsonAsync("/api/MapPoints", create);
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await ReadApiAsync<MapPointResponseDto>(createResponse);
        created.Name.Should().Be("Test Nokta");
        created.Longitude.Should().BeApproximately(32.85, 0.001);

        var listUrl = "/api/MapPoints?minLon=32&minLat=39&maxLon=33&maxLat=40&limit=10";
        var listResponse = await _client.GetAsync(listUrl);
        listResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var list = await ReadApiAsync<MapPointListResultDto>(listResponse);
        list.Items.Should().Contain(p => p.Number == "INT-001");
        list.Truncated.Should().BeFalse();
    }

    private async Task<string> LoginAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequestDto
        {
            UserName = "admin",
            Password = "admin",
        });
        var body = await ReadApiAsync<AuthResponseDto>(response);
        return body.AccessToken;
    }

    private static async Task<T> ReadApiAsync<T>(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        var wrapper = JsonSerializer.Deserialize<ApiResponse<T>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
        });
        wrapper.Should().NotBeNull();
        wrapper!.Success.Should().BeTrue();
        wrapper.Data.Should().NotBeNull();
        return wrapper.Data!;
    }
}
