import { sql } from "../../../../../db";
import { errorResponse,requireAdmin,writeAudit } from "../../../../../db/admin-auth";
const categories = new Set([
  "Instagram","Adobe Creative Cloud","Headspace","Picsart","n8n Starter","Surfshark VPN","ChatGPT",
  "Amazon Prime Video","Kling AI","QuillBot","ExpressVPN","Dreamina","Codex","Canva",
  "LinkedIn Career","Spotify","Apple Music","Cursor Pro","Grok","CapCut Pro","LinkedIn Business",
  "Telegram Premium","Suno Premier","Perplexity Pro","HMA VPN","Claude","Lovable AI","YouTube Premium",
  "Gamma Pro","HeyGen Creator","Proton VPN","ElevenLabs","Manus","Xbox Game Pass Ultimate",
  "Microsoft 365","Meitu SVIP","Google AI / Gemini","Figma","Netflix","Paramount+","TikTok US",
  "Google AI Pro","Fortnite","Gmail","NordVPN","Duolingo Super","Adobe Full Apps","Veo 3 Ultra",
  "Microsoft Office 365","Hotmail","Notion","OpenArt","Supabase Pro","Outlook","Antigravity",
]);

function productDescription(category:string,name:string){
  return `Code digital ${category} pour ${name}, livre apres validation du paiement.`;
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const admin=await requireAdmin("products"),{id}=await params,body=await request.json() as Record<string,unknown>;
    const name=String(body.name??"").trim();
    const productType=String(body.productType??"").trim();
    const status=body.status==="out_of_stock"?"out_of_stock":"published";
    const priceCents=Math.round(Number(body.price)*100);
    if(name.length<2||!categories.has(productType)||!Number.isInteger(priceCents)||priceCents<0){
      return Response.json({error:"Entrez un nom, une categorie et un prix valides."},{status:400});
    }
    const rows=await sql`update products set name=${name},description=${productDescription(productType,name)},product_type=${productType},price_cents=${priceCents},currency='mad',version='Code digital',status=${status},updated_at=now() where id=${id} returning id`;
    if(!rows.length)return Response.json({error:"Product not found"},{status:404});
    await writeAudit(admin,"product.update","product",id,{name,productType,priceCents,status});
    return Response.json({ok:true});
  }catch(error){return errorResponse(error)}
}

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const admin=await requireAdmin("products"),{id}=await params;
    const rows=await sql`update products set status='archived',updated_at=now() where id=${id} returning id`;
    if(!rows.length)return Response.json({error:"Product not found"},{status:404});
    await writeAudit(admin,"product.delete","product",id,{});
    return Response.json({ok:true});
  }catch(error){return errorResponse(error)}
}
