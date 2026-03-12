import { type NextRequest, NextResponse } from "next/server"

const BOSSPAY_PUBLIC_KEY = "pk_live_f78559a96d482cf8eed577827074a068f0fe4b6adeb7add0"
const BOSSPAY_SECRET_KEY = "sk_live_dd88e95efd43f45b1a89080abe615df41af5f943271fab5d"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount_cents, customer_name, customer_document, customer_phone, customer_email, description, external_id } = body

    console.log("[v0] PIX create request body:", body)

    if (!amount_cents || !customer_name || !customer_document || !customer_phone) {
      return NextResponse.json(
        { success: false, error: "Parâmetros obrigatórios faltando" },
        { status: 400 }
      )
    }

    const requestBody = {
      amount_cents,
      customer_name,
      customer_document: customer_document.replace(/\D/g, ""),
      customer_phone: customer_phone.replace(/\D/g, ""),
      customer_email: customer_email || undefined,
      description: description || "Acordo Serasa Limpa Nome",
      external_id,
      expiration: 3600,
    }

    console.log("[v0] Sending to BossPay:", JSON.stringify(requestBody))

    const response = await fetch("https://app.bosspay.cash/api/v1/pix/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${BOSSPAY_SECRET_KEY}`,
        "X-Public-Key": BOSSPAY_PUBLIC_KEY,
        "X-Secret-Key": BOSSPAY_SECRET_KEY,
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    console.log("[v0] BossPay response status:", response.status)
    console.log("[v0] BossPay response body:", responseText)

    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      console.error("[v0] Failed to parse response:", responseText)
      return NextResponse.json(
        { success: false, error: "Resposta inválida da API" },
        { status: 500 }
      )
    }

    if (!response.ok || !data.success) {
      console.error("[v0] BossPay API error:", data)
      return NextResponse.json(
        { success: false, error: data.message || data.error || "Erro ao gerar PIX" },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      txid: data.txid,
      amount_cents: data.amount_cents,
      pix: {
        copia_e_cola: data.pix.copia_e_cola,
        qr_code_base64: data.pix.qr_code_base64,
        expiration: data.pix.expiration,
      },
      customer: data.customer,
    })
  } catch (error) {
    console.error("[v0] Error creating PIX:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno ao processar pagamento" },
      { status: 500 }
    )
  }
}
