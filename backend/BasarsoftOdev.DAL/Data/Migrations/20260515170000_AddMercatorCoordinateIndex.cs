using BasarsoftOdev.DAL.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BasarsoftOdev.DAL.Data.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260515170000_AddMercatorCoordinateIndex")]
public partial class AddMercatorCoordinateIndex : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateIndex(
            name: "IX_map_points_XMercator_YMercator",
            table: "map_points",
            columns: new[] { "XMercator", "YMercator" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_map_points_XMercator_YMercator",
            table: "map_points");
    }
}
