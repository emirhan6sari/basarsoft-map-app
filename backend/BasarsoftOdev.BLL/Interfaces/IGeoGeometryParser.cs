using BasarsoftOdev.BLL.Services.GeoImport;

namespace BasarsoftOdev.BLL.Interfaces;

public interface IGeoGeometryParser
{
    IReadOnlyList<GeoImportCandidate> Parse(string format, string content);
}
