using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Dtos;
using FluentAssertions;

namespace BasarsoftOdev.Tests.Integration;

[Collection(IntegrationTestCollection.Name)]
public class AuthApiTests
{
    private readonly HttpClient _client;

    public AuthApiTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Login_WithSeedAdmin_ReturnsTokens()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequestDto
        {
            UserName = "admin",
            Password = "admin",
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await ReadApiAsync<AuthResponseDto>(response);
        body.AccessToken.Should().NotBeNullOrWhiteSpace();
        body.RefreshToken.Should().NotBeNullOrWhiteSpace();
        body.Roles.Should().Contain("Admin");
    }

    [Fact]
    public async Task Login_InvalidPassword_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequestDto
        {
            UserName = "admin",
            Password = "wrong-password",
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Me_WithoutToken_Returns401()
    {
        var response = await _client.GetAsync("/api/auth/me");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Me_WithValidToken_ReturnsProfile()
    {
        var token = await LoginAndGetAccessTokenAsync();
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var profile = await ReadApiAsync<UserProfileDto>(response);
        profile.UserName.Should().Be("admin");
        profile.Roles.Should().Contain("Admin");
    }

    private async Task<string> LoginAndGetAccessTokenAsync()
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
