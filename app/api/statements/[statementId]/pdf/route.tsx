import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { BillPdfDocument } from "@/components/user/bill-pdf-document";
import { getStatementDocumentData } from "@/lib/data-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ statementId: string }> },
) {
  const { statementId } = await context.params;
  const data = await getStatementDocumentData(statementId);

  if (!data.flat) {
    return NextResponse.json({ error: "Flat not found for statement." }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    <BillPdfDocument
      flat={{
        flatNumber: data.flat.flatNumber,
        ownerName: data.flat.ownerName,
      }}
      statement={data.statement}
      commonBill={data.commonBill}
      individualBill={data.individualBill}
      payments={data.payments}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="statement-${statementId}.pdf"`,
    },
  });
}
