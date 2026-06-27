import { LitComponentImplementation } from "../../types.cjs";
import "../../index.cjs";
import { z } from "zod";

//#region src/web-components/catalog/minimal/column.d.ts
declare const ColumnSchema: z.ZodObject<{
  children: z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodObject<{
    componentId: z.ZodString;
    path: z.ZodString;
  }, "strip", z.ZodTypeAny, {
    componentId: string;
    path: string;
  }, {
    componentId: string;
    path: string;
  }>]>;
  justify: z.ZodOptional<z.ZodEnum<["start", "center", "end", "spaceBetween", "spaceAround", "spaceEvenly", "stretch"]>>;
  align: z.ZodOptional<z.ZodEnum<["center", "end", "start", "stretch"]>>;
}, "strip", z.ZodTypeAny, {
  children?: string[] | {
    componentId: string;
    path: string;
  };
  justify?: "center" | "start" | "end" | "spaceBetween" | "spaceAround" | "spaceEvenly" | "stretch";
  align?: "center" | "start" | "end" | "stretch";
}, {
  children?: string[] | {
    componentId: string;
    path: string;
  };
  justify?: "center" | "start" | "end" | "spaceBetween" | "spaceAround" | "spaceEvenly" | "stretch";
  align?: "center" | "start" | "end" | "stretch";
}>;
declare const ColumnApiDef: {
  name: string;
  schema: z.ZodObject<{
    children: z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodObject<{
      componentId: z.ZodString;
      path: z.ZodString;
    }, "strip", z.ZodTypeAny, {
      componentId: string;
      path: string;
    }, {
      componentId: string;
      path: string;
    }>]>;
    justify: z.ZodOptional<z.ZodEnum<["start", "center", "end", "spaceBetween", "spaceAround", "spaceEvenly", "stretch"]>>;
    align: z.ZodOptional<z.ZodEnum<["center", "end", "start", "stretch"]>>;
  }, "strip", z.ZodTypeAny, {
    children?: string[] | {
      componentId: string;
      path: string;
    };
    justify?: "center" | "start" | "end" | "spaceBetween" | "spaceAround" | "spaceEvenly" | "stretch";
    align?: "center" | "start" | "end" | "stretch";
  }, {
    children?: string[] | {
      componentId: string;
      path: string;
    };
    justify?: "center" | "start" | "end" | "spaceBetween" | "spaceAround" | "spaceEvenly" | "stretch";
    align?: "center" | "start" | "end" | "stretch";
  }>;
};
declare const Column: LitComponentImplementation;
//#endregion
export { Column, ColumnApiDef, ColumnSchema };
//# sourceMappingURL=column.d.cts.map