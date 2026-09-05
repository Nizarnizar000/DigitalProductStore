import { sql } from "../../../../db";
import { errorResponse,requireAdmin,writeAudit } from "../../../../db/admin-auth";

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

function slugify(value:string){
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);
}

function productDescription(category:string,name:string){
  return `Code digital ${category} pour ${name}, livre apres validation du paiement.`;
}

export async function GET(){
  try{
    await requireAdmin("products");
    const products=await sql`select id,slug,name,description,product_type as "productType",status,price_cents as "priceCents",currency,version,download_limit as "downloadLimit",updated_at as "updatedAt" from products where status<>'archived' order by updated_at desc`;
    return Response.json({products});
  }catch(error){return errorResponse(error)}
}

export async function POST(request:Request){
  try{
    const admin=await requireAdmin("products");
    const body=await request.json() as Record<string,unknown>;
    const name=String(body.name??"").trim();
    const productType=String(body.productType??"").trim();
    const status=body.status==="out_of_stock"?"out_of_stock":"published";
    const priceCents=Math.round(Number(body.price)*100);
    if(name.length<2||!categories.has(productType)||!Number.isInteger(priceCents)||priceCents<0){
      return Response.json({error:"Entrez un nom, une categorie et un prix valides."},{status:400});
    }
    const baseSlug=slugify(`${productType}-${name}`);
    const slug=`${baseSlug}-${Date.now().toString(36)}`;
    const rows=await sql<{id:string}[]>`insert into products(slug,name,description,product_type,status,price_cents,currency,version,download_limit) values (${slug},${name},${productDescription(productType,name)},${productType},${status},${priceCents},'mad','Code digital',1) returning id`;
    await writeAudit(admin,"product.create","product",rows[0].id,{name,slug,productType,priceCents,status});
    return Response.json({id:rows[0].id},{status:201});
  }catch(error){return errorResponse(error)}
}
