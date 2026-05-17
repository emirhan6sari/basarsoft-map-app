using System;
using BasarsoftOdev.DAL.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BasarsoftOdev.DAL.Data.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260515120000_RemoveLocationAndUpdatedAt")]
    /// <inheritdoc />
    public partial class RemoveLocationAndUpdatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP INDEX IF EXISTS "IX_map_points_Location";
                ALTER TABLE map_points DROP COLUMN IF EXISTS "Location";
                ALTER TABLE map_points DROP COLUMN IF EXISTS "UpdatedAt";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "map_points",
                type: "timestamptz",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "map_points",
                type: "geometry(Point, 4326)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("""
                UPDATE map_points
                SET "Location" = ST_SetSRID(ST_MakePoint("Longitude", "Latitude"), 4326)
                WHERE "Longitude" <> 0 OR "Latitude" <> 0;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_map_points_Location",
                table: "map_points",
                column: "Location")
                .Annotation("Npgsql:IndexMethod", "gist");
        }
    }
}
