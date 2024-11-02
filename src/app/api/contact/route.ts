import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import z from "zod";
import { WebClient } from "@slack/web-api";
import { defaultHeaders } from "@/utils/header";

const token = process.env.CONTACT_FORM_NOTIFICATOR_ACCESS_TOKEN;
const web = new WebClient(token);

const headers = defaultHeaders;

const schema = z.object({
  name: z.string(),
  email: z.string().email(),
  status: z.string(),
  body: z.string(),
});

type Schema = z.infer<typeof schema>;

function buildMessage({ name, email, status, body }: Schema): string {
  return `<!channel>
:raising_hand: ASE-Lab. Contactフォームからご連絡をいただきました :raising_hand:

*お名前*
${name}

*メールアドレス*
${email}

*ご職業*
${status}

*本文*
${body}
`;
}

async function postMessage(msg: string): Promise<boolean> {
  try {
    await web.chat.postMessage({
      channel: "#0_form_notifications",
      text: msg,
    });
  } catch (e) {
    return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400, headers });
  }

  const msg = buildMessage(result.data);

  if (!(await postMessage(msg))) {
    return NextResponse.json(
      { error: "Failed to post message to Slack" },
      { status: 400, headers }
    );
  }

  return NextResponse.json({ message: "success" }, { status: 200, headers });
}

export function OPTIONS(_request: NextRequest) {
  return NextResponse.json({}, { headers });
}
