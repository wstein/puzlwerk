import {
  create2x2Solver,
  type PhysicalPrint,
  type PhysicalState,
  type HTMMove,
} from "@puzwerk/solver-2x2";
async function consumer(
  bytes: Uint8Array,
  print: PhysicalPrint,
  from: PhysicalState,
  target: PhysicalState,
) {
  const solver = await create2x2Solver(bytes, print);
  const exact = solver.solve2x2(from, target, { mode: "exactPhysical" });
  const quotient = solver.solve2x2(from, target, {
    mode: "rotationEquivalent",
  });
  const moves: readonly HTMMove[] = exact.moves;
  // @ts-expect-error Mode must never be selected implicitly.
  solver.solve2x2(from, target);
  // @ts-expect-error Unsupported color-only goal.
  solver.solve2x2(from, target, { mode: "colorOnly" });
  const exactGuarantee: "not-guaranteed" = exact.optimality;
  const quotientGuarantee: "rotation-equivalent-HTM" = quotient.optimality;
  return { moves, quotient, exactGuarantee, quotientGuarantee };
}
void consumer;
