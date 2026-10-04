import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { SwissQRBill } from 'swissqrbill/pdf'
import PDFDocument from 'pdfkit'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
      return new NextResponse('paymentId is required', { status: 400 })
    }

    const adminSupabase = createAdminSupabaseClient()

    const { data: payment, error } = await adminSupabase
      .from('payments')
      .select('*, user:user_id(*)')
      .eq('id', paymentId)
      .single()

    if (error || !payment) {
      return new NextResponse('Payment not found', { status: 404 })
    }

    // Try to get parent's name from user table
    let parentName = 'Unbekannt'
    if (payment.user_id) {
      const { data: userProfile } = await adminSupabase
        .from('user')
        .select('name')
        .eq('id', payment.user_id)
        .single()
        
      if (userProfile && userProfile.name) {
        parentName = String(userProfile.name)
      } else if (payment.user && typeof payment.user === 'object' && 'name' in payment.user) {
        parentName = String(payment.user.name)
      }
    }
    
    // If we still don't have it, try metadata
    if (parentName === 'Unbekannt' && payment.metadata && typeof payment.metadata === 'object') {
      const meta = payment.metadata as Record<string, any>
      if (meta.payer_email) {
        parentName = meta.payer_email
      }
    }

    const iban = process.env.BANK_TRANSFER_IBAN || 'CH3509000000000000001'
    const creditorName = process.env.BANK_TRANSFER_CREDITOR_NAME || 'ZAP'
    const creditorAddress = process.env.BANK_TRANSFER_CREDITOR_ADDRESS || 'Street 1'
    const creditorZip = parseInt(process.env.BANK_TRANSFER_CREDITOR_ZIP || '1234', 10) || 1234
    const creditorCity = process.env.BANK_TRANSFER_CREDITOR_CITY || 'Zurich'

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const pdf = new PDFDocument({ autoFirstPage: false });
        const qrBill = new SwissQRBill({
          amount: payment.amount_rappen / 100,
          currency: 'CHF',
          creditor: {
            account: iban,
            name: creditorName,
            address: creditorAddress,
            zip: creditorZip,
            city: creditorCity,
            country: 'CH'
          },
          debtor: {
            name: parentName,
            address: 'Bitte ergänzen',
            zip: '0000',
            city: 'Bitte ergänzen',
            country: 'CH'
          },
          message: `ZAP Anmeldung: ${paymentId}`
        });

        qrBill.attachTo(pdf);

        const chunks: Buffer[] = []
        pdf.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)))
        pdf.on('end', () => resolve(Buffer.concat(chunks)))
        pdf.on('error', (err: Error) => reject(err))
        
        pdf.end();
      } catch (err) {
        reject(err)
      }
    })

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="ZAP_Rechnung_${paymentId}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return new NextResponse('Internal Server Error while generating PDF. Please ensure your BANK_TRANSFER_IBAN is a valid Swiss IBAN format.', { status: 500 })
  }
}
