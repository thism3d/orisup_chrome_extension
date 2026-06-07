/**
 * Default seeded content for the 8 Brand Trust pages.
 *
 * - English (`*En`) is the source of truth and required.
 * - Bangla (`*Bn`) mirrors are optional; the storefront falls back to English when empty.
 * - Bodies use a small token language: `{{brand}}`, `{{phone}}`, `{{email}}`, `{{address}}` — these are
 *   substituted at render time from `platform_settings`, so the same default copy works for
 *   orlenbd / norexbd / orynbd without rewriting.
 *
 * Layout follows the reference Bangladesh e-commerce sites (StarTech, UltraTech, Daraz, Pickaboo):
 * H2 sections + paragraphs + bullet/numbered lists + an optional contact line at the end.
 */

export const BRAND_TRUST_SLUGS = [
  "about",
  "contact",
  "terms",
  "privacy",
  "returns",
  "warranty",
  "faq",
  "payments",
] as const;

export type BrandTrustSlug = (typeof BRAND_TRUST_SLUGS)[number];

export type ContentPageDefault = {
  slug: BrandTrustSlug;
  kicker: string;
  titleEn: string;
  introEn: string;
  bodyEn: string;
  metaDescriptionEn: string;
  titleBn: string;
  introBn: string;
  bodyBn: string;
  metaDescriptionBn: string;
};

const ABOUT_BODY_EN = `<p>{{brand}} is a multi-vendor online marketplace operating across Bangladesh. We connect customers with verified independent sellers offering electronics, fashion, home, beauty, books and lifestyle products — with secure checkout, vendor-fulfilled delivery and cash-on-delivery support where the seller offers it.</p>

<h2>Our story</h2>
<p>{{brand}} was founded with one motto in mind: <em>“Customers come first.”</em> What started as a small effort to help local sellers reach more buyers has grown into a country-wide marketplace — backed by a logistics partner network, customer service team and growing roster of approved vendors.</p>

<h2>Our main goal &amp; aim</h2>
<p>We are here to help with your everyday shopping. Our aim is to provide what our customers want — at the right price, with clear product information and fast support — and to keep improving the experience based on what customers tell us.</p>

<h2>Services we provide</h2>
<ul>
  <li>Multi-vendor catalogue covering electronics, fashion, home and accessories</li>
  <li>Secure checkout with multiple payment options (cards, wallets, COD where supported)</li>
  <li>Vendor-fulfilled nationwide delivery with order tracking</li>
  <li>Customer support over phone, email and the on-site contact form</li>
  <li>Vendor onboarding for businesses that want to sell on the platform</li>
</ul>

<h2>Dealing with the corporate sector</h2>
<p>{{brand}} also serves businesses, schools, hospitals, government offices and corporate clients — supplying IT hardware, networking, peripherals and consumables at negotiated rates. For corporate enquiries please use the contact page.</p>

<h2>Customer satisfaction</h2>
<p>We have been in the market long enough to know that listening matters. We continuously refine the platform — search, checkout, returns and after-sales — so customers can shop confidently and sellers can grow.</p>

<h2>The brand that cares for you</h2>
<p>{{brand}} is committed to honest pricing, accurate descriptions and reliable after-sales service. Come and experience the products, prices and care that have made us a trusted name in Bangladesh.</p>

<h2>Get in touch</h2>
<p>Office: {{address}}<br/>Phone: {{phone}}<br/>Email: {{email}}</p>`;

const ABOUT_BODY_BN = `<p>{{brand}} হলো বাংলাদেশজুড়ে পরিচালিত একটি মাল্টি-ভেন্ডর অনলাইন মার্কেটপ্লেস। আমরা ক্রেতাদের যাচাইকৃত স্বাধীন বিক্রেতার সাথে যুক্ত করি — ইলেকট্রনিকস, ফ্যাশন, হোম, বিউটি, বই ও লাইফস্টাইল পণ্য, নিরাপদ চেকআউট, বিক্রেতা-পরিবেশিত ডেলিভারি ও সমর্থিত হলে ক্যাশ অন ডেলিভারি সহ।</p>

<h2>আমাদের গল্প</h2>
<p>{{brand}} প্রতিষ্ঠিত হয়েছে একটি মূলমন্ত্র নিয়ে — <em>“গ্রাহকই আগে।”</em> ছোট একটি প্রয়াস থেকে শুরু হয়ে এটি আজ একটি দেশজুড়ে বিস্তৃত মার্কেটপ্লেস; লজিস্টিক পার্টনার, সাপোর্ট টিম ও অনুমোদিত বিক্রেতা নিয়ে।</p>

<h2>আমাদের লক্ষ্য</h2>
<p>প্রতিদিনের কেনাকাটায় সহায়ক হওয়া — ন্যায্য দাম, স্পষ্ট পণ্য তথ্য, দ্রুত সাপোর্ট — এবং গ্রাহকের ফিডব্যাক অনুযায়ী অভিজ্ঞতা ক্রমাগত উন্নত করা।</p>

<h2>আমাদের সেবা</h2>
<ul>
  <li>ইলেকট্রনিকস, ফ্যাশন, হোম ও অ্যাকসেসরিজ — মাল্টি-ভেন্ডর ক্যাটালগ</li>
  <li>নিরাপদ চেকআউট: কার্ড, ওয়ালেট ও সমর্থিত হলে COD</li>
  <li>সারা দেশে বিক্রেতা-পরিবেশিত ডেলিভারি ও অর্ডার ট্র্যাকিং</li>
  <li>ফোন, ইমেইল ও যোগাযোগ ফর্মে গ্রাহক সাপোর্ট</li>
  <li>বিক্রেতাদের জন্য ভেন্ডর অনবোর্ডিং</li>
</ul>

<h2>যোগাযোগ</h2>
<p>অফিস: {{address}}<br/>ফোন: {{phone}}<br/>ইমেইল: {{email}}</p>`;

const CONTACT_BODY_EN = `<p>We read every message. Use the contact details below to reach our support team — for the fastest help with an order, please include your order number. The form at the bottom of this page also goes directly to our support inbox.</p>
<p>For partnership and corporate enquiries please email {{email}} with a short brief.</p>`;

const CONTACT_BODY_BN = `<p>প্রতিটি বার্তা আমরা পড়ি। নিচের তথ্যে যোগাযোগ করুন — অর্ডার সংক্রান্ত সহায়তার জন্য অর্ডার নম্বর উল্লেখ করুন। নিচের ফর্মটিও সরাসরি সাপোর্ট ইনবক্সে পৌঁছায়।</p>
<p>পার্টনারশিপ বা কর্পোরেট অনুরোধের জন্য সংক্ষিপ্ত বিবরণ সহ {{email}}-এ ইমেইল করুন।</p>`;

const TERMS_BODY_EN = `<p>These terms govern your use of {{brand}}. By accessing or using the site, you agree to these terms. If you do not agree, please do not use the service.</p>

<h2>Disclaimer</h2>
<p>Prices, specifications and product images are subject to change without prior notice. {{brand}} is not responsible for typographical or photographic errors. Product colour, size and texture may vary slightly from what is shown on screen.</p>

<h2>Marketplace role</h2>
<p>{{brand}} is a marketplace where independent vendors list and sell products. For each order, the sales contract is between the customer and the relevant vendor; we provide the platform, payment infrastructure and support coordination as described on the site.</p>

<h2>Accounts</h2>
<p>Keep your sign-in information accurate and confidential. You are responsible for activity under your account. We may limit, suspend or close accounts that breach these terms or harm other users.</p>

<h2>Pricing &amp; availability</h2>
<p>Vendors set prices, stock levels and promotions. We aim for accurate listings; however, errors, stock changes or order cancellations can occur where the law and fair practice allow.</p>

<h2>Payment terms</h2>
<p>Online prices may be obtained via payment gateway. Additional gateway fees may apply on online payments. If a refund is required, it may take 10–15 working days; bank or partner timing applies. See the <a href="/payments">Payment disclosures</a> and <a href="/returns">Refund &amp; Return Policy</a> pages for details.</p>

<h2>Product listings</h2>
<p>{{brand}} strives for accuracy in product descriptions, photographs, compatibility references, specifications and pricing. Due to human error or supplier change, listings may not always be fully accurate, complete or current; we are not liable for such errors.</p>

<h2>Processing time</h2>
<p>Orders are normally processed within 48–72 hours after order verification. We aim for same-day dispatch where possible. Orders are not processed on public holidays.</p>

<h2>RMA claim</h2>
<p>The customer must present proof of purchase (invoice, cash receipt) for any warranty claim. {{brand}} reserves the right to refuse service to anyone. We cannot guarantee compatibility of components — please confirm before purchase. See the <a href="/returns">Return &amp; Refund Policy</a> on RMA timelines.</p>

<h2>Physical damage policy</h2>
<p>Physical damage to a product caused by improper installation, liquid spill, mishandling, fire, lightning or accident voids the warranty. The customer is responsible for any return courier charges in such cases.</p>

<h2>Warranty</h2>
<p>Products are sold with manufacturer warranty only, where applicable. {{brand}} acts as a facilitator between the customer and the manufacturer for warranty service. See the <a href="/warranty">Warranty Policy</a> for full terms.</p>

<h2>Limitation of liability</h2>
<p>To the extent permitted by law, our liability is limited to the amount paid for the product in question. Nothing that cannot legally be limited is excluded.</p>

<h2>Contact</h2>
<p>Questions about these terms? Email {{email}} or call {{phone}}.</p>`;

const TERMS_BODY_BN = `<p>এই শর্তাবলি {{brand}} ব্যবহারকে নিয়ন্ত্রণ করে। সাইট ব্যবহার করার মাধ্যমে আপনি এই শর্তাবলিতে সম্মত হচ্ছেন। সম্মত না হলে সাইট ব্যবহার করবেন না।</p>

<h2>মার্কেটপ্লেসের ভূমিকা</h2>
<p>{{brand}} একটি মার্কেটপ্লেস যেখানে স্বাধীন বিক্রেতারা পণ্য তালিকাভুক্ত ও বিক্রি করেন। প্রতিটি অর্ডারে চুক্তি সংশ্লিষ্ট বিক্রেতার সঙ্গে; আমরা প্ল্যাটফর্ম, পেমেন্ট ও সাপোর্ট সমন্বয় প্রদান করি।</p>

<h2>মূল্য ও স্টক</h2>
<p>মূল্য, স্টক ও প্রোমো বিক্রেতা নির্ধারণ করেন। আমরা সঠিক তালিকার চেষ্টা করি; ত্রুটি বা বাতিল হতে পারে।</p>

<h2>পেমেন্ট</h2>
<p>অনলাইন পেমেন্টে গেটওয়ে ফি প্রযোজ্য হতে পারে। রিফান্ড প্রয়োজন হলে ১০–১৫ কর্মদিবস লাগতে পারে।</p>

<h2>ওয়ারেন্টি</h2>
<p>প্রযোজ্য ক্ষেত্রে শুধুমাত্র উৎপাদকের ওয়ারেন্টি প্রযোজ্য। বিস্তারিত <a href="/warranty">ওয়ারেন্টি নীতি</a> দেখুন।</p>

<h2>দায় সীমাবদ্ধতা</h2>
<p>আইন অনুমোদিত সীমা পর্যন্ত আমাদের দায় সংশ্লিষ্ট পণ্যের পরিশোধিত মূল্যের মধ্যে সীমাবদ্ধ।</p>

<h2>যোগাযোগ</h2>
<p>প্রশ্ন থাকলে ইমেইল করুন {{email}} বা ফোন করুন {{phone}}.</p>`;

const PRIVACY_BODY_EN = `<p>This privacy policy describes how {{brand}} ("we", "us") collects, uses and protects personal information when you use this website. By using the site you consent to the practices described in this policy.</p>

<h2>Who we are</h2>
<p>Our website address is {{address}}. Customer support: {{email}} · {{phone}}.</p>

<h2>What personal information do we collect?</h2>
<p>When ordering, registering or subscribing on our site, we may collect your name, email address, phone number, shipping address and other relevant details. When you simply browse the site we collect basic device, log and analytics data.</p>

<h2>When do we collect information?</h2>
<p>We collect information when you create an account, place an order, subscribe to a newsletter, fill out a form, contact support or interact with the site in similar ways.</p>

<h2>How do we use your information?</h2>
<ul>
  <li>To fulfil and deliver your orders</li>
  <li>To personalize your experience and product recommendations</li>
  <li>To improve our website, customer service and product offerings</li>
  <li>To send transactional and promotional messages (you may opt out)</li>
  <li>To prevent fraud and abuse, and to comply with the law</li>
</ul>

<h2>How do we protect your information?</h2>
<p>Our website is scanned regularly for known vulnerabilities. We use SSL/TLS for transmission of sensitive data. We do not store full credit card numbers; payments are handled by licensed payment processors per their own policies.</p>

<h2>Cookies</h2>
<p>Yes, we use cookies for tracking purposes — to remember preferences, keep your session active, understand traffic and improve features. You can set your browser to disable cookies; some site features may then not function correctly.</p>

<h2>Third parties &amp; analytics</h2>
<p>We use trusted third-party services (e.g. Google Analytics, payment gateways) that operate under their own privacy policies. We do not sell your personal data for third-party marketing.</p>

<h2>Children's privacy</h2>
<p>This site is not directed at children under 13. We do not knowingly collect personal information from children under 13.</p>

<h2>Your rights</h2>
<p>You may access, update or delete account data when signed in. For other privacy requests (export, erasure) please contact us at {{email}}, subject to applicable law.</p>

<h2>Changes to this policy</h2>
<p>We may update this policy from time to time. The latest version will always be available on this page; continued use of the site after changes constitutes acceptance.</p>

<h2>Contacting us</h2>
<p>If you have questions about this privacy policy, contact us at {{email}} or call {{phone}}.</p>`;

const PRIVACY_BODY_BN = `<p>এই গোপনীয়তা নীতি বর্ণনা করে {{brand}} কীভাবে আপনার ব্যক্তিগত তথ্য সংগ্রহ, ব্যবহার ও সুরক্ষা করে। সাইট ব্যবহার করলে আপনি এই নীতিতে সম্মত হচ্ছেন।</p>

<h2>আমরা কারা</h2>
<p>ঠিকানা: {{address}}. সাপোর্ট: {{email}} · {{phone}}.</p>

<h2>কী সংগ্রহ করি</h2>
<p>অর্ডার বা রেজিস্ট্রেশনে: নাম, ইমেইল, ফোন, ঠিকানা ইত্যাদি। শুধু ব্রাউজ করলে: ডিভাইস ও লগ তথ্য।</p>

<h2>কীভাবে ব্যবহার করি</h2>
<ul>
  <li>অর্ডার পূরণ ও ডেলিভারি</li>
  <li>অভিজ্ঞতা ও সুপারিশ পার্সোনালাইজ করা</li>
  <li>ওয়েবসাইট ও সেবা উন্নয়ন</li>
  <li>লেনদেন/প্রোমো বার্তা (অপ্ট-আউট সম্ভব)</li>
  <li>প্রতারণা প্রতিরোধ ও আইন মেনে চলা</li>
</ul>

<h2>সুরক্ষা</h2>
<p>সংবেদনশীল তথ্য আদান-প্রদানে SSL/TLS ব্যবহার। সম্পূর্ণ কার্ড নম্বর সংরক্ষণ করি না; পেমেন্ট লাইসেন্সধারী প্রসেসর পরিচালনা করে।</p>

<h2>কুকিজ</h2>
<p>সাইট অভিজ্ঞতা উন্নত করতে কুকিজ ব্যবহার করি। ব্রাউজার থেকে নিষ্ক্রিয় করা যাবে; কিছু ফিচার তখন কাজ নাও করতে পারে।</p>

<h2>আপনার অধিকার</h2>
<p>সাইন-ইনে কিছু তথ্য হালনাগাদ/মুছে ফেলা যায়। অন্যান্য অনুরোধ: {{email}}.</p>

<h2>যোগাযোগ</h2>
<p>{{email}} বা {{phone}}.</p>`;

const RETURNS_BODY_EN = `<p>{{brand}} works with multiple independent vendors. Return rules depend on category, seller and product condition. Always check the product page and your order details before you buy.</p>

<h2>How to request a return</h2>
<ol>
  <li>Sign in to your {{brand}} account and open the order from "My orders".</li>
  <li>Tap "Return / Refund" for the relevant order item.</li>
  <li>Select the type of return problem you are facing.</li>
  <li>Fill out the online return form with all relevant information and photos.</li>
  <li>Choose pick-up or drop-off as per your preference.</li>
  <li>Submit the request after reading the Return / Refund policy.</li>
  <li>Hand the product over to our pick-up rider — keep your contact information correct and reachable.</li>
</ol>

<h2>Conditions for returns</h2>
<ul>
  <li>The product must be in its original condition: <strong>unused, unworn, unwashed</strong> and free of any flaws.</li>
  <li>Include the original tags, user manuals, warranty cards, freebies, invoice and any accessories.</li>
  <li>Return the product in its original, undamaged manufacturer's packaging or box. Do not place tape or stickers directly on the manufacturer's packaging.</li>
  <li>For online orders, please <strong>inform us within 24 hours</strong> via our hotline or contact form if any manufacturing issue or problem is noticed at the time of receiving the product.</li>
  <li>If you ordered the wrong product (size/colour), please <strong>do not open or damage the box</strong>; products and packaging must be intact for the return to be accepted.</li>
  <li>If a customer wants to change a defective product through our delivery service, a replacement charge of <strong>BDT 200/-</strong> applies inside Dhaka; outside Dhaka, only the courier charge applies.</li>
</ul>

<h2>Refunds</h2>
<p>If approved, refunds are issued to the original payment method or as store credit (where agreed). Bank/partner timing applies — typically 3 to 10 working days from approval. Refund charges may apply for mobile financial services / online gateway / POS payment refunds.</p>

<h2>Non-returnable items</h2>
<p>Some items are not eligible for return unless faulty or not as described — examples: hygiene products, perishables, software with broken seal, customised items, digital goods and final-sale clearance items.</p>

<h2>Important reminder</h2>
<ul>
  <li>If your return request is rejected, the item will be sent back to you within 4–6 days after the quality-check process.</li>
  <li>After three failed delivery attempts, the item may be marked as scrap and no refund will be provided.</li>
</ul>

<h2>Need help?</h2>
<p>Call {{phone}} or email {{email}} — we are here to help.</p>`;

const RETURNS_BODY_BN = `<p>{{brand}} একাধিক স্বাধীন বিক্রেতার সাথে কাজ করে। রিটার্নের নিয়ম পণ্যের ক্যাটাগরি, বিক্রেতা ও অবস্থার উপর নির্ভর করে। কেনার আগে অবশ্যই পণ্যের পেজ ও অর্ডার বিবরণ দেখে নিন।</p>

<h2>রিটার্নের জন্য আবেদন</h2>
<ol>
  <li>আপনার {{brand}} অ্যাকাউন্টে সাইন ইন করে "আমার অর্ডার" থেকে অর্ডারটি খুলুন।</li>
  <li>সংশ্লিষ্ট পণ্যের জন্য "রিটার্ন / রিফান্ড" অপশনে ক্লিক করুন।</li>
  <li>সমস্যার ধরন বাছাই করুন।</li>
  <li>প্রয়োজনীয় তথ্য ও ছবি সহ ফর্ম পূরণ করুন।</li>
  <li>পিকআপ অথবা ড্রপ-অফ বেছে নিন এবং সাবমিট করুন।</li>
</ol>

<h2>রিটার্নের শর্ত</h2>
<ul>
  <li>পণ্য মূল অবস্থায় থাকতে হবে — অব্যবহৃত, ক্ষতিগ্রস্ত নয়।</li>
  <li>মূল ট্যাগ, ম্যানুয়াল, ওয়ারেন্টি কার্ড, ইনভয়েস ও অ্যাকসেসরি ফেরত দিতে হবে।</li>
  <li>মূল প্যাকেজিংয়ে ফেরত দিন; প্যাকেজে স্টিকার/টেপ লাগাবেন না।</li>
  <li>অনলাইন অর্ডারে ত্রুটি দেখা গেলে <strong>২৪ ঘণ্টার মধ্যে</strong> জানান।</li>
  <li>ভুল সাইজ/রঙ অর্ডার করলে — <strong>বক্স খুলবেন না বা নষ্ট করবেন না</strong>।</li>
  <li>ঢাকার মধ্যে রিপ্লেসমেন্ট চার্জ <strong>২০০/-</strong> টাকা; ঢাকার বাইরে শুধু কুরিয়ার চার্জ প্রযোজ্য।</li>
</ul>

<h2>রিফান্ড</h2>
<p>অনুমোদিত রিফান্ড মূল পেমেন্ট মাধ্যমে বা স্টোর ক্রেডিট হিসেবে দেওয়া হয়; ব্যাংক/পার্টনারের সময় অনুযায়ী সাধারণত ৩–১০ কর্মদিবস।</p>

<h2>সহায়তা</h2>
<p>{{phone}} বা {{email}}.</p>`;

const WARRANTY_BODY_EN = `<p>Before buying any product from {{brand}}, please pay attention to the terms and conditions noted below. Once a product is purchased and the receipt is issued, the buyer is deemed to have read and accepted these warranty terms.</p>

<h2>What is covered</h2>
<ul>
  <li>Manufacturing defects under normal use, within the warranty period printed on the warranty card or invoice.</li>
  <li>Components included in the original sealed package (no missing items).</li>
  <li>Service or replacement coordination with the manufacturer / authorised service centre.</li>
</ul>

<h2>What is not covered</h2>
<ul>
  <li>Physical damage: cracks, dents, broken screens, bent pins, water/liquid damage, burnt parts.</li>
  <li>Damage from improper installation, voltage spikes, lightning, fire or accident.</li>
  <li>Tampered, altered or removed warranty stickers / serial numbers.</li>
  <li>Software issues, virus infections, lost passwords, accidental data loss — please back up before service.</li>
  <li>Consumables and free gifts (cables, batteries, headphones, mouse pads, screen protectors).</li>
  <li>Products outside the warranty period or used outside the manufacturer's specifications.</li>
</ul>

<h2>How to claim warranty</h2>
<ol>
  <li>Bring the product, original invoice / warranty card and all accessories to the {{brand}} service desk or send via courier.</li>
  <li>Our technicians will inspect the product and verify warranty status.</li>
  <li>If the issue is covered, we coordinate repair or replacement with the manufacturer / authorised service centre. The standard service window is 7 to 30 working days depending on the product and parts availability.</li>
  <li>For products requiring international RMA, the timeline may extend up to 60–90 working days.</li>
  <li>If the product is found to be out of warranty or damaged due to physical / liquid causes, the customer will be informed of the chargeable repair cost before any work begins.</li>
</ol>

<h2>Customer responsibilities</h2>
<ul>
  <li>Keep the original invoice and warranty card safely for the entire warranty period.</li>
  <li>Back up your data before submitting any storage device for service — {{brand}} is not responsible for data loss.</li>
  <li>Provide accurate contact information so we can reach you with status updates.</li>
  <li>Pick up the serviced product within 30 days of completion notification.</li>
</ul>

<h2>Battery &amp; consumables</h2>
<p>Batteries, adapters and similar consumables typically carry a 3- to 6-month warranty against manufacturing defects. Wear and tear from normal use is not covered.</p>

<h2>Need help?</h2>
<p>Call {{phone}} or email {{email}} for warranty status, RMA enquiries or service centre directions.</p>`;

const WARRANTY_BODY_BN = `<p>{{brand}} থেকে পণ্য ক্রয়ের আগে এই ওয়ারেন্টি শর্তাবলী মনোযোগ দিয়ে পড়ুন। পণ্য ক্রয়ের পর গ্রাহককে এই শর্তাবলী মেনে নেওয়ার ভিত্তিতেই বিক্রয় সম্পন্ন বলে গণ্য হবে।</p>

<h2>যা কাভার করে</h2>
<ul>
  <li>ওয়ারেন্টি মেয়াদের মধ্যে স্বাভাবিক ব্যবহারে উৎপাদনের ত্রুটি।</li>
  <li>মূল প্যাকেজিংয়ের সব উপাদান অক্ষুণ্ণ থাকা।</li>
</ul>

<h2>যা কাভার করে না</h2>
<ul>
  <li>শারীরিক ক্ষতি, পানি বা আগুন, বজ্রপাত, ভোল্টেজ স্পাইক ইত্যাদি কারণে ক্ষতি।</li>
  <li>ওয়ারেন্টি স্টিকার বা সিরিয়াল নম্বর পরিবর্তন/মুছে ফেলা।</li>
  <li>সফটওয়্যার সমস্যা, ভাইরাস, ডেটা হারানো (সার্ভিসের আগে ডেটা ব্যাকআপ নিন)।</li>
  <li>কনজিউমেবল ও ফ্রি গিফট (ক্যাবল, ব্যাটারি, হেডফোন, স্ক্রিন প্রটেক্টর)।</li>
</ul>

<h2>ওয়ারেন্টি ক্লেইম</h2>
<ol>
  <li>মূল ইনভয়েস/ওয়ারেন্টি কার্ড ও সব অ্যাকসেসরি সহ পণ্যটি {{brand}} সার্ভিস ডেস্কে আনুন বা কুরিয়ারে পাঠান।</li>
  <li>আমাদের টেকনিশিয়ান পণ্যটি পরীক্ষা করবেন।</li>
  <li>সাধারণ সার্ভিস টাইম ৭ থেকে ৩০ কর্মদিবস; আন্তর্জাতিক RMA-এর ক্ষেত্রে ৬০–৯০ কর্মদিবস।</li>
</ol>

<h2>সহায়তা</h2>
<p>{{phone}} বা {{email}}.</p>`;

const FAQ_BODY_EN = `<p>Common questions about shopping, orders, delivery and selling on {{brand}}.</p>

<h2>Ordering &amp; payment</h2>
<h3>How do I place an order?</h3>
<p>Add items to your cart, go to checkout, enter your shipping details and confirm. Available payment options appear at checkout (e.g. cash on delivery when offered by the seller).</p>

<h3>Can I change or cancel an order?</h3>
<p>Contact us as soon as possible. Once a seller has started processing or shipped the order, changes may not be possible.</p>

<h3>What payment methods do you accept?</h3>
<p>We accept major debit/credit cards, mobile financial services (where supported by the seller), and cash on delivery on eligible items.</p>

<h2>Delivery</h2>
<h3>How long does delivery take?</h3>
<p>Delivery times and fees depend on the vendor, product and your area. See the product page and checkout for an estimate. Inside Dhaka usually arrives within 1–3 working days; outside Dhaka, 3–7 working days.</p>

<h3>How can I track my order?</h3>
<p>Sign in and go to "My orders" — each order page shows the latest status. You will also receive SMS/email notifications at major status changes.</p>

<h2>Returns</h2>
<h3>How do returns work?</h3>
<p>See our <a href="/returns">Return &amp; Refund Policy</a> for eligibility, timelines and how to request a return.</p>

<h2>Selling on {{brand}}</h2>
<h3>How can I become a vendor?</h3>
<p>Apply through the vendor portal. Our team reviews each application; once approved you can start listing products. For commercial questions, use the contact form or the channels listed in the footer.</p>

<h2>Account</h2>
<h3>I forgot my password — what should I do?</h3>
<p>On the login page, click "Forgot password" and follow the email instructions. If you do not receive the email, check the spam folder or contact support at {{email}}.</p>`;

const FAQ_BODY_BN = `<p>{{brand}}-তে কেনাকাটা, অর্ডার, ডেলিভারি ও বিক্রি সম্পর্কে সাধারণ প্রশ্ন।</p>

<h2>অর্ডার ও পেমেন্ট</h2>
<h3>কীভাবে অর্ডার দিই?</h3>
<p>কার্টে যোগ করুন, চেকআউটে যান, ঠিকানা দিয়ে নিশ্চিত করুন। চেকআউটে পেমেন্ট অপশন দেখা যাবে।</p>

<h3>অর্ডার পরিবর্তন/বাতিল করা যাবে?</h3>
<p>দ্রুত যোগাযোগ করুন। বিক্রেতা প্রসেস বা শিপিং শুরু করলে পরিবর্তন সম্ভব নাও হতে পারে।</p>

<h2>ডেলিভারি</h2>
<h3>ডেলিভারি কতদিন লাগে?</h3>
<p>ঢাকার ভেতরে ১–৩ কর্মদিবস; ঢাকার বাইরে ৩–৭ কর্মদিবস।</p>

<h2>রিটার্ন</h2>
<h3>রিটার্ন কীভাবে কাজ করে?</h3>
<p>বিস্তারিত: <a href="/returns">রিটার্ন ও রিফান্ড নীতি</a>।</p>

<h2>বিক্রি</h2>
<h3>ভেন্ডর কীভাবে হবো?</h3>
<p>ভেন্ডর পোর্টালে আবেদন করুন; অনুমোদনের পর পণ্য তালিকাভুক্ত করা যাবে।</p>`;

const PAYMENTS_BODY_EN = `<p>{{brand}} supports multiple payment methods at checkout. Available options depend on the vendor, your region and the integration's availability at the time you place the order.</p>

<h2>Payment methods</h2>
<ul>
  <li>Major debit and credit cards (Visa, Mastercard, American Express, local cards)</li>
  <li>Mobile financial services where supported by the seller (bKash, Nagad, Rocket)</li>
  <li>Internet banking and EMI on selected banks</li>
  <li>Cash on delivery on eligible items inside the supported delivery area</li>
</ul>

<h2>Third-party processors</h2>
<p>Card and wallet charges may be handled by licensed payment partners (e.g. SSLCommerz, ShurjoPay, bKash). Their own terms and privacy policies apply to the payment step. We do not store your full card numbers on our servers.</p>

<h2>Cash on delivery</h2>
<p>If COD is offered, please pay the courier or follow the seller's process. Have the exact amount ready unless told otherwise. COD may not be available for high-value items, pre-orders or addresses outside the supported delivery area.</p>

<h2>EMI</h2>
<p>Equated Monthly Instalments are available on selected products with selected banks. The applicable EMI plans, processing fees and minimum amounts are shown on the product page and at checkout. EMI eligibility is decided by the issuing bank.</p>

<h2>Refunds</h2>
<p>Approved refunds usually go to the original payment method. Bank/partner timing applies — typically 3 to 10 working days from approval. Refund charges may apply for mobile financial services / online gateway / POS payment refunds.</p>

<h2>Receipts &amp; invoices</h2>
<p>An invoice is generated for every order and sent by email. You can also download it from "My orders" while signed in.</p>

<h2>Need help?</h2>
<p>Email {{email}} or call {{phone}} for any payment-related questions.</p>`;

const PAYMENTS_BODY_BN = `<p>{{brand}} চেকআউটে একাধিক পেমেন্ট মাধ্যম সমর্থন করে। প্রাপ্যতা বিক্রেতা ও অঞ্চলভেদে পরিবর্তিত হয়।</p>

<h2>পেমেন্ট মাধ্যম</h2>
<ul>
  <li>ডেবিট ও ক্রেডিট কার্ড (ভিসা, মাস্টারকার্ড, অ্যামেক্স)</li>
  <li>মোবাইল ফাইন্যান্সিয়াল সার্ভিস (bKash, Nagad, Rocket)</li>
  <li>ইন্টারনেট ব্যাংকিং ও নির্দিষ্ট ব্যাংকে EMI</li>
  <li>প্রযোজ্য পণ্যে ক্যাশ অন ডেলিভারি</li>
</ul>

<h2>তৃতীয় পক্ষ</h2>
<p>লাইসেন্সধারী পেমেন্ট পার্টনার (যেমন SSLCommerz, ShurjoPay, bKash) পরিচালনা করে; তাদের শর্ত ও গোপনীয়তা প্রযোজ্য।</p>

<h2>ক্যাশ অন ডেলিভারি</h2>
<p>COD প্রযোজ্য হলে কুরিয়ার রাইডারকে নির্ধারিত পরিমাণ পরিশোধ করুন।</p>

<h2>রিফান্ড</h2>
<p>সাধারণত মূল মাধ্যমে ৩–১০ কর্মদিবসে।</p>

<h2>সহায়তা</h2>
<p>{{email}} বা {{phone}}.</p>`;

export const CONTENT_PAGE_DEFAULTS: Record<BrandTrustSlug, ContentPageDefault> = {
  about: {
    slug: "about",
    kicker: "Company",
    titleEn: "About us",
    introEn:
      "What {{brand}} stands for — our marketplace, our mission, and how we work with customers and vendors.",
    bodyEn: ABOUT_BODY_EN,
    metaDescriptionEn:
      "Learn about {{brand}} — Bangladesh's multi-vendor marketplace for electronics, fashion, home and more.",
    titleBn: "আমাদের সম্পর্কে",
    introBn:
      "{{brand}} — আমাদের মার্কেটপ্লেস, মিশন ও ক্রেতা-বিক্রেতাদের সঙ্গে কাজের ধরন।",
    bodyBn: ABOUT_BODY_BN,
    metaDescriptionBn:
      "{{brand}} সম্পর্কে জানুন — ইলেকট্রনিকস, ফ্যাশন, হোমসহ বাংলাদেশের মাল্টি-ভেন্ডর মার্কেটপ্লেস।",
  },
  contact: {
    slug: "contact",
    kicker: "Support",
    titleEn: "Contact us",
    introEn:
      "Reach our team for orders, account help, and vendor or partnership questions. Check the FAQ for quick answers.",
    bodyEn: CONTACT_BODY_EN,
    metaDescriptionEn:
      "Reach {{brand}} for customer support, vendor questions and general inquiries.",
    titleBn: "যোগাযোগ করুন",
    introBn: "অর্ডার, অ্যাকাউন্ট, ভেন্ডর সংক্রান্ত সহায়তা — দ্রুত উত্তরের জন্য এফএকিউ দেখুন।",
    bodyBn: CONTACT_BODY_BN,
    metaDescriptionBn: "{{brand}}-তে সাপোর্ট, ভেন্ডর ও সাধারণ অনুরোধ।",
  },
  terms: {
    slug: "terms",
    kicker: "Legal",
    titleEn: "Terms & conditions",
    introEn:
      "Rules for using the marketplace, accounts, payments and liability. Please read together with our privacy policy.",
    bodyEn: TERMS_BODY_EN,
    metaDescriptionEn: "Terms of use for {{brand}} customers and visitors.",
    titleBn: "শর্তাবলি",
    introBn: "মার্কেটপ্লেস ব্যবহারের নিয়ম — গোপনীয়তা নীতির সঙ্গে পড়ুন।",
    bodyBn: TERMS_BODY_BN,
    metaDescriptionBn: "{{brand}} ব্যবহারের শর্তাবলি।",
  },
  privacy: {
    slug: "privacy",
    kicker: "Legal",
    titleEn: "Privacy policy",
    introEn:
      "How we collect, use, and protect your personal information when you shop on {{brand}}.",
    bodyEn: PRIVACY_BODY_EN,
    metaDescriptionEn:
      "How {{brand}} collects, uses and protects your personal information.",
    titleBn: "গোপনীয়তা নীতি",
    introBn: "এই সাইটে ব্যক্তিগত তথ্য কীভাবে নেওয়া, ব্যবহার ও সুরক্ষিত হয়।",
    bodyBn: PRIVACY_BODY_BN,
    metaDescriptionBn: "{{brand}} কীভাবে আপনার তথ্য সংগ্রহ ও সুরক্ষা করে।",
  },
  returns: {
    slug: "returns",
    kicker: "Support",
    titleEn: "Return & refund policy",
    introEn:
      "Eligibility, timelines and how returns work across the sellers on {{brand}}.",
    bodyEn: RETURNS_BODY_EN,
    metaDescriptionEn:
      "Return and refund guidelines for purchases on {{brand}}.",
    titleBn: "রিটার্ন ও রিফান্ড নীতি",
    introBn: "যথার্থতা, সময়সীমা ও কিভাবে রিটার্ন কাজ করে।",
    bodyBn: RETURNS_BODY_BN,
    metaDescriptionBn: "রিটার্ন ও রিফান্ড নির্দেশিকা।",
  },
  warranty: {
    slug: "warranty",
    kicker: "Support",
    titleEn: "Warranty policy",
    introEn:
      "Manufacturer warranty terms, what is and isn't covered, and how to claim service through {{brand}}.",
    bodyEn: WARRANTY_BODY_EN,
    metaDescriptionEn: "Warranty coverage, RMA process and claim timelines on {{brand}}.",
    titleBn: "ওয়ারেন্টি নীতি",
    introBn: "ওয়ারেন্টির শর্ত, কী কাভার করে এবং ক্লেইমের প্রক্রিয়া।",
    bodyBn: WARRANTY_BODY_BN,
    metaDescriptionBn: "{{brand}}-তে ওয়ারেন্টি সেবা ও RMA প্রক্রিয়া।",
  },
  faq: {
    slug: "faq",
    kicker: "Support",
    titleEn: "Help & FAQ",
    introEn:
      "Common questions about shopping, orders, delivery and selling on {{brand}}.",
    bodyEn: FAQ_BODY_EN,
    metaDescriptionEn:
      "Frequently asked questions about shopping, orders, delivery and selling on {{brand}}.",
    titleBn: "সহায়তা ও প্রশ্নোত্তর",
    introBn: "{{brand}} সম্পর্কে সাধারণ প্রশ্নোত্তর।",
    bodyBn: FAQ_BODY_BN,
    metaDescriptionBn: "{{brand}} সম্পর্কে সাধারণ প্রশ্নোত্তর।",
  },
  payments: {
    slug: "payments",
    kicker: "Legal",
    titleEn: "Payment disclosures",
    introEn:
      "How payment methods work on the marketplace, including cards, mobile wallets, EMI and cash on delivery.",
    bodyEn: PAYMENTS_BODY_EN,
    metaDescriptionEn:
      "Information about payment methods and partners on {{brand}}.",
    titleBn: "পেমেন্ট তথ্য",
    introBn: "কার্ড, ওয়ালেট, EMI ও COD-এর প্রেক্ষিতে পেমেন্ট পদ্ধতি।",
    bodyBn: PAYMENTS_BODY_BN,
    metaDescriptionBn: "{{brand}} পেমেন্ট পদ্ধতি ও পার্টনার সম্বন্ধে তথ্য।",
  },
};

/** Replace `{{brand}} / {{phone}} / {{email}} / {{address}}` tokens with live values. */
export function applyContentPageTokens(
  source: string,
  tokens: { brand?: string; phone?: string; email?: string; address?: string }
): string {
  if (!source) return "";
  return source
    .replaceAll("{{brand}}", tokens.brand?.trim() || "")
    .replaceAll("{{phone}}", tokens.phone?.trim() || "")
    .replaceAll("{{email}}", tokens.email?.trim() || "")
    .replaceAll("{{address}}", tokens.address?.trim().replace(/\n/g, "<br/>") || "");
}
