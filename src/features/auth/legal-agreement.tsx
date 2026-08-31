import * as React from 'react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckboxField } from '@/components/ui/checkbox'
import { formatDate } from '@/lib/format'

interface LegalAgreementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyName: string
  country: string
  onAccept: () => void | Promise<void>
}

/** One paragraph of a clause. `n` is the subsection number; `emphasis` marks the
 *  conspicuous ALL-CAPS disclaimers that have to stand out from the body. */
interface Clause {
  n?: string
  text: string
  emphasis?: boolean
}

interface Section {
  n: string
  title: string
  clauses: Clause[]
}

/**
 * The operative SaaS Services Agreement. The bodies are reproduced verbatim; the
 * Company's own particulars are fixed, and the Customer's name, country and the
 * execution date are filled from the registration form at render time.
 */
const SECTIONS: Section[] = [
  {
    n: '1',
    title: 'SaaS services and support',
    clauses: [
      {
        n: '1.1',
        text: 'Subject to the terms of this Agreement, Company will use commercially reasonable efforts to provide Customer the Services in accordance with the Service Level Terms attached hereto as Exhibit B. As part of the registration process, Customer will identify an administrative user name and password for Customer’s Company account. Company reserves the right to refuse registration of, or cancel passwords it deems inappropriate.',
      },
      {
        n: '1.2',
        text: 'Subject to the terms hereof, Company will provide Customer with reasonable technical support services in accordance with the terms set forth in accordance with Company’s standard practice.',
      },
    ],
  },
  {
    n: '2',
    title: 'Restrictions and responsibilities',
    clauses: [
      {
        n: '2.1',
        text: 'Customer will not, directly or indirectly: reverse engineer, decompile, disassemble or otherwise attempt to discover the source code, object code or underlying structure, ideas, know-how or algorithms relevant to the Services or any software, documentation or data related to the Services (“Software”); modify, translate, or create derivative works based on the Services or any Software (except to the extent expressly permitted by Company or authorized within the Services); use the Services or any Software for timesharing or service bureau purposes or otherwise for the benefit of a third; or remove any proprietary notices or labels. With respect to any Software that is distributed or provided to Customer for use on Customer premises or devices, Company hereby grants Customer a non-exclusive, non-transferable, non-sublicensable license to use such Software during the Term only in connection with the Services.',
      },
      {
        n: '2.2',
        text: 'Further, Customer may not remove or export from the United States or allow the export or re-export of the Services, Software or anything related thereto, or any direct product thereof in violation of any restrictions, laws or regulations of the United States Department of Commerce, the United States Department of Treasury Office of Foreign Assets Control, or any other United States or foreign agency or authority. As defined in FAR section 2.101, the Software and documentation are “commercial items” and according to DFAR section 252.227-7014(a)(1) and (5) are deemed to be “commercial computer software” and “commercial computer software documentation.” Consistent with DFAR section 227.7202 and FAR section 12.212, any use modification, reproduction, release, performance, display, or disclosure of such commercial software or commercial software documentation by the U.S. Government will be governed solely by the terms of this Agreement and will be prohibited except to the extent expressly permitted by the terms of this Agreement.',
      },
      {
        n: '2.3',
        text: 'Customer represents, covenants, and warrants that Customer will use the Services only in compliance with Company’s standard published policies then in effect (the “Policy”) and all applicable laws and regulations. Customer hereby agrees to indemnify and hold harmless Company against any damages, losses, liabilities, settlements and expenses (including without limitation costs and attorneys’ fees) in connection with any claim or action that arises from an alleged violation of the foregoing or otherwise from Customer’s use of Services. Although Company has no obligation to monitor Customer’s use of the Services, Company may do so and may prohibit any use of the Services it believes may be (or alleged to be) in violation of the foregoing.',
      },
      {
        n: '2.4',
        text: 'Customer shall be responsible for obtaining and maintaining any equipment and ancillary services needed to connect to, access or otherwise use the Services, including, without limitation, modems, hardware, servers, software, operating systems, networking, web servers and the like (collectively, “Equipment”). Customer shall also be responsible for maintaining the security of the Equipment, Customer account, passwords (including but not limited to administrative and user passwords) and files, and for all uses of Customer account or the Equipment with or without Customer’s knowledge or consent.',
      },
    ],
  },
  {
    n: '3',
    title: 'Confidentiality; proprietary rights',
    clauses: [
      {
        n: '3.1',
        text: 'Each party (the “Receiving Party”) understands that the other party (the “Disclosing Party”) has disclosed or may disclose business, technical or financial information relating to the Disclosing Party’s business (hereinafter referred to as “Proprietary Information” of the Disclosing Party). Proprietary Information of Company includes non-public information regarding features, functionality and performance of the Service. Proprietary Information of Customer includes non-public data provided by Customer to Company to enable the provision of the Services (“Customer Data”). The Receiving Party agrees: (i) to take reasonable precautions to protect such Proprietary Information, and (ii) not to use (except in performance of the Services or as otherwise permitted herein) or divulge to any third person any such Proprietary Information. The Disclosing Party agrees that the foregoing shall not apply with respect to any information after five (5) years following the disclosure thereof or any information that the Receiving Party can document (a) is or becomes generally available to the public, or (b) was in its possession or known by it prior to receipt from the Disclosing Party, or (c) was rightfully disclosed to it without restriction by a third party, or (d) was independently developed without use of any Proprietary Information of the Disclosing Party or (e) is required to be disclosed by law.',
      },
      {
        n: '3.2',
        text: 'Customer shall own all right, title and interest in and to the Customer Data. Company shall own and retain all right, title and interest in and to (a) the Services and Software, all improvements, enhancements or modifications thereto, (b) any software, applications, inventions or other technology developed in connection with Implementation Services or support, and (c) all intellectual property rights related to any of the foregoing.',
      },
      {
        n: '3.3',
        text: 'Notwithstanding anything to the contrary, Company shall have the right collect and analyze data and other information relating to the provision, use and performance of various aspects of the Services and related systems and technologies (including, without limitation, information concerning Customer Data and data derived therefrom), and Company will be free (during and after the term hereof) to (i) use such information and data to improve and enhance the Services and for other development, diagnostic and corrective purposes in connection with the Services and other Company offerings, and (ii) disclose such data solely in aggregate or other de-identified form in connection with its business. No rights or licenses are granted except as expressly set forth herein.',
      },
    ],
  },
  {
    n: '4',
    title: 'Payment of fees',
    clauses: [
      {
        n: '4.1',
        text: 'Customer will pay Company the then applicable fees described in the Order Form for the Services and Implementation Services in accordance with the terms therein (the “Fees”). If Customer’s use of the Services exceeds the Service Capacity set forth on the Order Form or otherwise requires the payment of additional fees (per the terms of this Agreement), Customer shall be billed for such usage and Customer agrees to pay the additional fees in the manner provided herein. Company reserves the right to change the Fees or applicable charges and to institute new charges and Fees at the end of the Initial Service Term or then-current renewal term, upon thirty (30) days prior notice to Customer (which may be sent by email). If Customer believes that Company has billed Customer incorrectly, Customer must contact Company no later than 60 days after the closing date on the first billing statement in which the error or problem appeared, in order to receive an adjustment or credit. Inquiries should be directed to Company’s customer support department.',
      },
      {
        n: '4.2',
        text: 'Company may choose to bill through an invoice, in which case, full payment for invoices issued in any given month must be received by Company thirty (30) days after the mailing date of the invoice. Unpaid amounts are subject to a finance charge of 1.5% per month on any outstanding balance, or the maximum permitted by law, whichever is lower, plus all expenses of collection and may result in immediate termination of Service. Customer shall be responsible for all taxes associated with Services other than U.S. taxes based on Company’s net income.',
      },
    ],
  },
  {
    n: '5',
    title: 'Term and termination',
    clauses: [
      {
        n: '5.1',
        text: 'Subject to earlier termination as provided below, this Agreement is for the Initial Service Term as specified in the Order Form, and shall be automatically renewed for additional periods of the same duration as the Initial Service Term (collectively, the “Term”), unless either party requests termination at least thirty (30) days prior to the end of the then-current term.',
      },
      {
        n: '5.2',
        text: 'In addition to any other remedies it may have, either party may also terminate this Agreement upon thirty (30) days’ notice (or without notice in the case of nonpayment), if the other party materially breaches any of the terms or conditions of this Agreement. Customer will pay in full for the Services up to and including the last day on which the Services are provided. Upon any termination, Company will make all Customer Data available to Customer for electronic retrieval for a period of 10 days, but thereafter Company may, but is not obligated to, delete stored Customer Data. All sections of this Agreement which by their nature should survive termination will survive termination, including, without limitation, accrued rights to payment, confidentiality obligations, warranty disclaimers, and limitations of liability.',
      },
    ],
  },
  {
    n: '6',
    title: 'Warranty and disclaimer',
    clauses: [
      {
        text: 'Company shall use reasonable efforts consistent with prevailing industry standards to maintain the Services in a manner which minimizes errors and interruptions in the Services and shall perform the Implementation Services in a professional and workmanlike manner. Services may be temporarily unavailable for scheduled maintenance or for unscheduled emergency maintenance, either by Company or by third-party providers, or because of other causes beyond Company’s reasonable control, but Company shall use reasonable efforts to provide advance notice in writing or by e-mail of any scheduled service disruption. However, Company does not warrant that the Services will be uninterrupted or error free; nor does it make any warranty as to the results that may be obtained from use of the Services.',
      },
      {
        emphasis: true,
        text: 'EXCEPT AS EXPRESSLY SET FORTH IN THIS SECTION, THE SERVICES AND IMPLEMENTATION SERVICES ARE PROVIDED “AS IS” AND COMPANY DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT.',
      },
    ],
  },
  {
    n: '7',
    title: 'Limitation of liability',
    clauses: [
      {
        emphasis: true,
        text: 'NOTWITHSTANDING ANYTHING TO THE CONTRARY, EXCEPT FOR BODILY INJURY OF A PERSON, COMPANY AND ITS SUPPLIERS (INCLUDING BUT NOT LIMITED TO ALL EQUIPMENT AND TECHNOLOGY SUPPLIERS), OFFICERS, AFFILIATES, REPRESENTATIVES, CONTRACTORS AND EMPLOYEES SHALL NOT BE RESPONSIBLE OR LIABLE WITH RESPECT TO ANY SUBJECT MATTER OF THIS AGREEMENT OR TERMS AND CONDITIONS RELATED THERETO UNDER ANY CONTRACT, NEGLIGENCE, STRICT LIABILITY OR OTHER THEORY: (A) FOR ERROR OR INTERRUPTION OF USE OR FOR LOSS OR INACCURACY OR CORRUPTION OF DATA OR COST OF PROCUREMENT OF SUBSTITUTE GOODS, SERVICES OR TECHNOLOGY OR LOSS OF BUSINESS; (B) FOR ANY INDIRECT, EXEMPLARY, INCIDENTAL, SPECIAL OR CONSEQUENTIAL DAMAGES; (C) FOR ANY MATTER BEYOND COMPANY’S REASONABLE CONTROL; OR (D) FOR ANY AMOUNTS THAT, TOGETHER WITH AMOUNTS ASSOCIATED WITH ALL OTHER CLAIMS, EXCEED THE FEES PAID BY CUSTOMER TO COMPANY FOR THE SERVICES UNDER THIS AGREEMENT IN THE 12 MONTHS PRIOR TO THE ACT THAT GAVE RISE TO THE LIABILITY, IN EACH CASE, WHETHER OR NOT COMPANY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.',
      },
    ],
  },
  {
    n: '8',
    title: 'Miscellaneous',
    clauses: [
      {
        text: 'If any provision of this Agreement is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary so that this Agreement will otherwise remain in full force and effect and enforceable. This Agreement is not assignable, transferable or sublicensable by Customer except with Company’s prior written consent. Company may transfer and assign any of its rights and obligations under this Agreement without consent. This Agreement is the complete and exclusive statement of the mutual understanding of the parties and supersedes and cancels all previous written and oral agreements, communications and other understandings relating to the subject matter of this Agreement, and that all waivers and modifications must be in a writing signed by both parties, except as otherwise provided herein. No agency, partnership, joint venture, or employment is created as a result of this Agreement and Customer does not have any authority of any kind to bind Company in any respect whatsoever. In any action or proceeding to enforce rights under this Agreement, the prevailing party will be entitled to recover costs and attorneys’ fees. All notices under this Agreement will be in writing and will be deemed to have been duly given when received, if personally delivered; when receipt is electronically confirmed, if transmitted by facsimile or e-mail; the day after it is sent, if sent for next day delivery by recognized overnight delivery service; and upon receipt, if sent by certified or registered mail, return receipt requested. This Agreement shall be governed by the laws of the State of Texas without regard to its conflict of laws provisions. The parties shall work together in good faith to issue at least one mutually agreed upon press release within 90 days of the Effective Date, and Customer otherwise agrees to reasonably cooperate with Company to serve as a reference account upon request.',
      },
    ],
  },
]

export function LegalAgreementDialog({
  open,
  onOpenChange,
  companyName,
  country,
  onAccept,
}: LegalAgreementDialogProps) {
  const [accepted, setAccepted] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (open) setAccepted(false)
  }, [open])

  async function confirm() {
    setBusy(true)
    try {
      await onAccept()
    } finally {
      setBusy(false)
    }
  }

  const today = formatDate(new Date().toISOString())
  const customer = companyName || 'your organisation'
  const preamble = `This SaaS Services Agreement ("Agreement") is entered into on ${today} between PatienTrials Inc. with a place of business at WeWork Legacy West, 7700 Windrose, Plano, TX 75024 ("Company"), and the Customer ${customer}${country ? ` from ${country}` : ''}. There shall be no force or effect to any different terms of any related purchase order or similar form even if signed by the parties after the date hereof.`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>SaaS Services Agreement</DialogTitle>
          <DialogDescription>
            Please read these terms. You need to accept them before your account can be created.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <article
            className="max-w-[72ch] space-y-6 text-sm leading-6 text-foreground"
            tabIndex={0}
            aria-label="SaaS Services Agreement terms"
          >
            <p className="text-muted-foreground">{preamble}</p>

            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Terms and conditions
            </p>

            {SECTIONS.map((section) => (
              <section key={section.n} className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {section.n}. {section.title}
                </h3>
                <div className="space-y-2">
                  {section.clauses.map((clause, index) => (
                    <p
                      key={clause.n ?? index}
                      className={clause.emphasis ? 'font-medium text-foreground' : 'text-muted-foreground'}
                    >
                      {clause.n && (
                        <span className="font-medium text-foreground">{clause.n} </span>
                      )}
                      {clause.text}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </article>
        </DialogBody>

        <DialogFooter className="sm:flex-col sm:items-stretch">
          <CheckboxField
            id="accept-agreement"
            checked={accepted}
            onCheckedChange={setAccepted}
            label="I have read and accept the SaaS Services Agreement on behalf of my organisation."
          />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="brand" onClick={confirm} disabled={!accepted} loading={busy}>
              Acknowledge and create account
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
