import { type NextRequest, NextResponse } from "next/server"

const CPF_API_TOKEN = "9d97e993b9bb5849c7750841e4866c75"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const cpf = searchParams.get("cpf")

  if (!cpf) {
    return NextResponse.json({ error: "CPF is required" }, { status: 400 })
  }

  try {
    // Clean CPF (remove non-digits)
    const cleanCpf = cpf.replace(/\D/g, "")

    // Call CPF Brasil API
    const response = await fetch(`https://api.cpf-brasil.org/cpf/${cleanCpf}`, {
      method: "GET",
      headers: {
        "X-API-Key": CPF_API_TOKEN,
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.message || `API responded with status: ${response.status}`)
    }

    // Get user location
    let locationData = { city: "São Paulo" } // Default fallback
    try {
      const locationResponse = await fetch("https://ipapi.co/json/")
      if (locationResponse.ok) {
        locationData = await locationResponse.json()
      }
    } catch (locationError) {
      console.log("Location API failed, using fallback")
    }

    // Map CPF Brasil API response to expected format
    return NextResponse.json({
      success: true,
      data: {
        nome: data.data?.NOME || "Usuário",
        nascimento: data.data?.NASC || "",
        mae: data.data?.NOME_MAE || "",
        sexo: data.data?.SEXO || "",
        cidade: locationData.city || "São Paulo",
      },
    })
  } catch (error) {
    console.error("Error fetching user data:", error)

    // Return fallback data instead of error
    return NextResponse.json({
      success: false,
      data: {
        nome: "Usuário",
        nascimento: "",
        mae: "",
        sexo: "",
        cidade: "São Paulo",
      },
      error: "Unable to fetch user data, using fallback",
    })
  }
}
