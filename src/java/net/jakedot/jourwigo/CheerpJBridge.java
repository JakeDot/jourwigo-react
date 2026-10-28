package net.jakedot.jourwigo;

public class CheerpJBridge {

    public static byte[] compileGwcFromLuaBytes(String name, String author, String version, String description,
                                                double latitude, double longitude, double altitude,
                                                String luaScript) throws Exception {
        CartridgeCompiler.CartridgeMetadata metadata = new CartridgeCompiler.CartridgeMetadata(
            name, author, version, description, latitude, longitude, altitude
        );
        return CartridgeCompiler.compileLuaToGwcBytes(metadata, luaScript);
    }

    public static String getVersion() {
        return "jourwigo CheerpJ 3.0 JVM Bridge (cgeo/cgeo Wherigo runtime)";
    }

    public static boolean isReady() {
        return true;
    }
}
