import * as core from "@kabelsalat/core";
import * as lib from "@kabelsalat/lib";
import { describe, expect, it } from "vitest";

Object.assign(globalThis, core);
Object.assign(globalThis, lib);

describe("compiler", () => {
  it("sine", () => {
    const unit = sine(200).output(0).exit().compile();
    expect(unit.src).toStrictEqual(
      `r[1] = nodes[0].update(200,0,0); /* sine */
r[3] = nodes[1].update(r[1],0); /* output */`
    );
    expect(unit.ugens.map((ugen) => ugen.type)).toStrictEqual([
      "SineOsc",
      "Output",
    ]);
  });
  it("feedback", () => {
    const unit = sine(200)
      .add((x) => x.mul(0.8))
      .output(1)
      .exit()
      .compile();
    expect(unit.src).toStrictEqual(
      `r[1] = nodes[0].update(200,0,0); /* sine */
r[3] = r[4] * 0.8;
r[4] = r[1] + r[3];
r[6] = nodes[1].update(r[4],1); /* output */`
    );
    expect(unit.ugens.map((ugen) => ugen.type)).toStrictEqual([
      "SineOsc",
      "Output",
    ]);
  });
});
