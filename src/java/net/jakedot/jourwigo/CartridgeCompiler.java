package net.jakedot.jourwigo;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;

/**
 * Compiler and code generator for assembling Lua cartridges and packaging them
 * into compiled GWC cartridge files in Java via CheerpJ.
 */
public class CartridgeCompiler {

    public static class CartridgeMetadata {
        private String name;
        private String author;
        private String version;
        private String description;
        private double latitude;
        private double longitude;
        private double altitude;

        public CartridgeMetadata(String name, String author, String version, String description,
                                 double latitude, double longitude, double altitude) {
            this.name = name != null ? name : "";
            this.author = author != null ? author : "";
            this.version = version != null ? version : "";
            this.description = description != null ? description : "";
            this.latitude = latitude;
            this.longitude = longitude;
            this.altitude = altitude;
        }

        public String getName() { return name; }
        public String getAuthor() { return author; }
        public String getVersion() { return version; }
        public String getDescription() { return description; }
        public double getLatitude() { return latitude; }
        public double getLongitude() { return longitude; }
        public double getAltitude() { return altitude; }
    }

    public static byte[] compileLuaToGwcBytes(CartridgeMetadata metadata, String luaScript) throws IOException {
        byte[] scriptBytes = luaScript.getBytes(StandardCharsets.UTF_8);
        return packageGwcBytes(metadata, scriptBytes);
    }

    public static byte[] packageGwcBytes(CartridgeMetadata metadata, byte[] bytecode) throws IOException {
        ByteArrayOutputStream headerBaos = new ByteArrayOutputStream();

        writeDouble(headerBaos, metadata.getLatitude());
        writeDouble(headerBaos, metadata.getLongitude());
        headerBaos.write(new byte[8]);
        headerBaos.write(new byte[8]);
        writeShort(headerBaos, (short) 0);
        writeShort(headerBaos, (short) 0);
        writeNullString(headerBaos, "Wherigo");
        writeNullString(headerBaos, "JourwigoPlayer");
        headerBaos.write(new byte[8]);
        writeNullString(headerBaos, metadata.getName());
        writeNullString(headerBaos, "12345678-1234-1234-1234-123456789012");
        writeNullString(headerBaos, metadata.getDescription());
        writeNullString(headerBaos, "Start description");
        writeNullString(headerBaos, metadata.getVersion());
        writeNullString(headerBaos, metadata.getAuthor());
        writeNullString(headerBaos, "https://github.com/JakeDot/jourwigo");
        writeNullString(headerBaos, "MIDP-2.0/CLDC-1.1");
        headerBaos.write(new byte[4]);
        writeNullString(headerBaos, "123456");

        byte[] headerBytes = headerBaos.toByteArray();

        int headerPos = 15;
        int bytecodeOffset = headerPos + 4 + headerBytes.length;

        ByteArrayOutputStream gwcBaos = new ByteArrayOutputStream();

        // Magic
        gwcBaos.write(new byte[] { 0x02, 0x0a, 0x43, 0x41, 0x52, 0x54, 0x00 });

        // Scan offsets table
        writeShort(gwcBaos, (short) 1);
        writeShort(gwcBaos, (short) 0);
        writeInt(gwcBaos, bytecodeOffset);

        // Scan header table
        writeInt(gwcBaos, headerBytes.length);
        gwcBaos.write(headerBytes);

        // Bytecode block
        writeInt(gwcBaos, bytecode.length);
        gwcBaos.write(bytecode);

        return gwcBaos.toByteArray();
    }

    private static void writeShort(ByteArrayOutputStream baos, short value) {
        ByteBuffer bb = ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN);
        bb.putShort(value);
        baos.write(bb.array(), 0, 2);
    }

    private static void writeInt(ByteArrayOutputStream baos, int value) {
        ByteBuffer bb = ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN);
        bb.putInt(value);
        baos.write(bb.array(), 0, 4);
    }

    private static void writeDouble(ByteArrayOutputStream baos, double value) {
        ByteBuffer bb = ByteBuffer.allocate(8).order(ByteOrder.LITTLE_ENDIAN);
        bb.putDouble(value);
        baos.write(bb.array(), 0, 8);
    }

    private static void writeNullString(ByteArrayOutputStream baos, String str) throws IOException {
        if (str != null) {
            baos.write(str.getBytes(StandardCharsets.UTF_8));
        }
        baos.write(0);
    }
}
