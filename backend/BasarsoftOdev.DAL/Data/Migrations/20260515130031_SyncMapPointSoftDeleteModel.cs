using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BasarsoftOdev.DAL.Data.Migrations
{
    /// <inheritdoc />
    public partial class SyncMapPointSoftDeleteModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_map_points_CreatedByUserId",
                table: "map_points",
                column: "CreatedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_map_points_AspNetUsers_CreatedByUserId",
                table: "map_points",
                column: "CreatedByUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_map_points_AspNetUsers_CreatedByUserId",
                table: "map_points");

            migrationBuilder.DropIndex(
                name: "IX_map_points_CreatedByUserId",
                table: "map_points");
        }
    }
}
