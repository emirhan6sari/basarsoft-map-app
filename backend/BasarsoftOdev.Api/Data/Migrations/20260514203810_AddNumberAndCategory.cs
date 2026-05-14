using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BasarsoftOdev.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddNumberAndCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "map_points",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Number",
                table: "map_points",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "map_points");

            migrationBuilder.DropColumn(
                name: "Number",
                table: "map_points");
        }
    }
}
