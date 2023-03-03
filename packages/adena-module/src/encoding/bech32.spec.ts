import { toBech32, fromBech32 } from "./bech32";
describe("", () => {

  it("same data + different prefix is success", () => {
    const gnoPrefix = "g";
    const cosmosPrefix = "cosmos";
    const data = [
      74, 68, 107, 246, 158, 109,
      222, 4, 48, 187, 237, 25,
      18, 199, 131, 120, 178, 100,
      176, 58
    ];
    const bytes = new Uint8Array(data);

    const gnoAddress = toBech32(gnoPrefix, bytes);
    const cosmosAddrss = toBech32(cosmosPrefix, bytes);

    expect(gnoAddress).toBe("g1ffzxha57dh0qgv9ma5v393ur0zexfvp6lsjpae");
    expect(cosmosAddrss).toBe("cosmos1ffzxha57dh0qgv9ma5v393ur0zexfvp6vvwzua");
  });

  it("address to data is same", () => {
    // Gno Address and Cosmos Address
    const gnoAddress = "g1ffzxha57dh0qgv9ma5v393ur0zexfvp6lsjpae";
    const cosmosAddress = "cosmos1ffzxha57dh0qgv9ma5v393ur0zexfvp6vvwzua";

    const gnoResult = fromBech32(gnoAddress);
    const comsmosResult = fromBech32(cosmosAddress);

    expect(gnoResult.prefix).toBe("g");
    expect(comsmosResult.prefix).toBe("cosmos");
    expect(gnoResult.data).toEqual(comsmosResult.data);
  });
});
