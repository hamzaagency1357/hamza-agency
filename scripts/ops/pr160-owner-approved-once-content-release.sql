-- PR #160: owner-approved single-use Production CONTENT release (not a schema migration).
-- No login/user creation, JWT impersonation, role grants, Edge Function, or PR merge.
-- Execution via authenticated Supabase management connection by the owner-authorized operator.
-- Fail-closed: expected original IDs, source fingerprints and field SHA-256, exclusive lock,
-- full private scoped preflight snapshot, no stale candidates, immutable old translation fields.
-- Audit actor is automation (never a forged super_admin/auth user).
-- COMPLETED AND DISABLED: v_apply=false runs validation without writes.
-- Never re-enable this executed release. A future release must have a new reviewed key and scope.
DO $pr160_once$
DECLARE
  v_apply boolean := false;
  v_release_key constant text := 'pr160-owner-authorized-tiktok-bigo-yaahlan-20261111-v1';
  v_origin_sha constant text := 'f4bb38a2a9b0f14d3d805a30228bff2b2d9ee2cb';
  v_actor constant text := 'pr160_owner_approved_one_shot_service';
  v_draft jsonb := '{"slug":"tiktok-live-hamza-agency","status":"draft","category":"guides","tags":["tiktok-live","join-agency","live-streaming"],"featuredImage":"","authorName":"HAMZA AGENCY","translations":{"ar":{"title":"الانضمام إلى وكالة حمزة على TikTok LIVE — الشروط والمميزات وطريقة التسجيل","excerpt":"دليل واضح للانضمام إلى وكالة حمزة على TikTok LIVE، ومتطلبات القبول وخطوات الطلب وروابط التسجيل والتواصل الرسمية.","content":"<p>إذا كنت صانع محتوى وتريد معرفة طريقة الانضمام إلى وكالة حمزة على TikTok LIVE، فهذا الدليل يوضح مسار التسجيل والمراجعة ووسائل التواصل المعتمدة، دون وعود بأرباح أو نتائج غير مؤكدة.</p>\n<h2>ما هي وكالة حمزة؟</h2>\n<p>وكالة حمزة <strong>ⒽⒶ</strong> هي وكالة تعمل مع صناع المحتوى في مجال برامج البث المباشر. يُعرَف الوكيل باسم <strong>⚔عܓོراب✴سܓོوريا⚔</strong>. يمكنك التعرف على برامج الوكالة وخدماتها من خلال <a href=\"/programs\">صفحة البرامج</a> في الموقع الرسمي.</p>\n<h2>ما هو TikTok LIVE؟</h2>\n<p>TikTok LIVE هي ميزة البث المباشر في منصة TikTok، تتيح للمبدعين التفاعل مع المشاهدين في الوقت الفعلي وفق قواعد المنصة وشروط الأهلية السارية. الانضمام إلى الوكالة مسار مختلف عن تفعيل ميزة LIVE في حسابك، ولا يلغي سياسات TikTok أو قراراتها المتعلقة بالمنصة.</p>\n<h2>ما الذي تستفيد منه عند التواصل مع الوكالة؟</h2>\n<ul><li>إرشادات واضحة حول طريقة إرسال طلب الانضمام والبيانات المطلوبة في النموذج.</li><li>وسيلة مباشرة للتواصل مع فريق وكالة حمزة للاستفسار عن الطلب.</li><li>متابعة حالة الطلب واستكمال البيانات عند الحاجة عبر قنوات الوكالة.</li><li>التعرّف على البرامج والخدمات المتاحة قبل اختيار المسار المناسب لك.</li></ul>\n<p>تختلف تفاصيل أي مزايا خاصة ببرنامج TikTok LIVE بحسب الشروط والإعلانات المعتمدة؛ لا تُعد هذه المقالة وعدًا برواتب أو أرباح أو مكافآت أو زيادة مشاهدات.</p>\n<h2>ما شروط التسجيل والقبول؟</h2>\n<p>يجب أن يستوفي المتقدم <strong>جميع الشروط والمتطلبات الفعلية للبرنامج</strong> وأن يقدم بيانات صحيحة وقابلة للتحقق، ويلتزم بالسياسات ذات الصلة. يمكن لفريق الوكالة توضيح المتطلبات الحالية لكل حالة قبل إتمام الانضمام. لا نحدد في هذه المقالة عدد متابعين أو عمرًا أو بلدًا أو أهداف بث ثابتة من دون مرجع معتمد.</p>\n<p><strong>سياسة القبول لدى الوكالة: القبول مضمون عند استيفاء جميع شروط ومتطلبات البرنامج والتحقق منها.</strong> هذا الضمان مشروط باستيفاء المتطلبات، ولا يعني ضمان تفعيل LIVE أو تجاوز قرارات TikTok أو الحصول على دخل معين.</p>\n<h2>كيف تقدم طلب الانضمام إلى TikTok LIVE عبر وكالة حمزة؟</h2>\n<ol><li>راجع معلومات البرنامج وشروطه المعلنة.</li><li>افتح <a href=\"https://www.tiktok.com/t/ZS2AxwqsK/\">رابط التقديم على TikTok المعتمد للوكالة</a> واتبع التعليمات الظاهرة.</li><li>يمكنك بدلًا من ذلك إرسال <a href=\"/programs/tiktok#apply\">طلب الانضمام عبر نموذج موقع وكالة حمزة</a>.</li><li>استخدم بيانات التواصل الصحيحة وانتظر مراجعة الطلب والتواصل معك عند الحاجة.</li><li>لأي استفسار، تواصل مباشرة عبر <a href=\"https://wa.me/905011730377\">واتساب وكالة حمزة: +905011730377</a>.</li></ol>\n<h2>الأسئلة الشائعة</h2>\n<h3>هل القبول مضمون في وكالة حمزة؟</h3>\n<p>نعم، القبول مضمون <strong>عند استيفاء جميع شروط ومتطلبات البرنامج والتحقق منها</strong>؛ وليس ضمانًا غير مشروط أو بديلًا عن سياسات TikTok.</p>\n<h3>هل أحتاج إلى التسجيل من رابط TikTok فقط؟</h3>\n<p>يمكنك استخدام <a href=\"https://www.tiktok.com/t/ZS2AxwqsK/\">رابط التقديم المخصص</a> أو <a href=\"/programs/tiktok#apply\">نموذج الانضمام في موقع الوكالة</a>، بحسب الطريقة المناسبة لحالتك.</p>\n<h3>هل تتعهد الوكالة براتب أو أرباح محددة؟</h3>\n<p>لا تقدم هذه المقالة أي تعهد مالي؛ تُحدَّد أي ترتيبات خاصة وفق معلومات البرنامج الرسمية والاتفاق المعتمد عند توفره.</p>\n<h3>ماذا يحدث بعد إرسال الطلب؟</h3>\n<p>تُراجع البيانات ويُتواصل مع المتقدم عند الحاجة لاستكمال المعلومات أو شرح الخطوات التالية.</p>\n<h3>كيف أتواصل مع وكالة حمزة؟</h3>\n<p>عبر <a href=\"https://wa.me/905011730377\">واتساب +905011730377</a> أو <a href=\"/contact\">صفحة التواصل</a> في الموقع.</p>\n<h2>ابدأ طلبك</h2>\n<p><strong>جاهز للتقديم؟</strong> اختر <a href=\"https://www.tiktok.com/t/ZS2AxwqsK/\">التسجيل عبر رابط TikTok</a> أو <a href=\"/programs/tiktok#apply\">نموذج وكالة حمزة</a>، واحتفظ برقم <a href=\"https://wa.me/905011730377\">واتساب الرسمي</a> لأي متابعة.</p>","seoTitle":"الانضمام إلى وكالة حمزة TikTok LIVE | الشروط والتسجيل","seoDescription":"كيفية الانضمام إلى وكالة حمزة على TikTok LIVE، شروط القبول المشروط، رابط التسجيل الرسمي، نموذج الموقع والتواصل عبر واتساب.","imageAlt":"ⒽⒶ شعار وكالة حمزة — دليل TikTok LIVE","ogTitle":"دليل الانضمام إلى وكالة حمزة على TikTok LIVE","ogDescription":"تعرف على خطوات التقديم وشروط القبول وروابط التسجيل الرسمية وواتساب وكالة حمزة.","ogImage":"","canonical":"","allowIndex":true},"en":{"title":"Join HAMZA AGENCY on TikTok LIVE — Requirements, Benefits and How to Apply","excerpt":"Learn how to apply to HAMZA AGENCY for TikTok LIVE, understand conditional acceptance, and find verified application and contact channels.","content":"<p>Interested in joining HAMZA AGENCY for TikTok LIVE? This guide explains the application process, what to check before applying, and the agency''s provided contact channels. It does not promise earnings or platform outcomes.</p>\n<h2>About HAMZA AGENCY</h2>\n<p><strong>HAMZA AGENCY ⒽⒶ</strong> works with content creators across live-streaming programs. The agency''s named representative is <strong>⚔عܓོراب✴سܓོوريا⚔</strong>. Explore the <a href=\"/en/programs\">programs page</a> for information about available programs.</p>\n<h2>What is TikTok LIVE?</h2>\n<p>TikTok LIVE lets eligible creators interact with their audience through live broadcasts, subject to TikTok''s current policies and eligibility rules. Joining an agency is distinct from TikTok enabling LIVE on an account and does not override platform decisions.</p>\n<h2>What support can applicants expect?</h2>\n<ul><li>Guidance on completing an agency application and supplying the required information.</li><li>A direct channel for questions about your application.</li><li>Application follow-up and requests for clarification where needed.</li><li>Help locating the agency''s available programs and official contact routes.</li></ul>\n<p>Program-specific benefits depend on approved terms; this guide does not guarantee income, rewards, views or followers.</p>\n<h2>Requirements and acceptance policy</h2>\n<p>Applicants must meet <strong>all applicable, current program requirements</strong>, provide accurate and verifiable information, and comply with relevant policies. Ask the agency team about the current criteria for your situation. This guide deliberately does not invent fixed follower, age, country or broadcast targets.</p>\n<p><strong>Acceptance is guaranteed when all program requirements are met and verified.</strong> This is a conditional agency acceptance policy, not a promise that TikTok will enable LIVE or guarantee any particular platform or financial outcome.</p>\n<h2>How to apply</h2>\n<ol><li>Check the program information and applicable conditions.</li><li>Use the <a href=\"https://www.tiktok.com/t/ZS2AxwqsK/\">agency''s provided TikTok application link</a> and follow the displayed instructions.</li><li>Alternatively, submit an application through <a href=\"/en/programs/tiktok#apply\">HAMZA AGENCY''s website form</a>.</li><li>Provide accurate contact details so the agency can review your request and follow up where needed.</li><li>For questions, contact <a href=\"https://wa.me/905011730377\">HAMZA AGENCY on WhatsApp: +905011730377</a>.</li></ol>\n<h2>Frequently asked questions</h2>\n<h3>Is acceptance guaranteed?</h3>\n<p>Yes, <strong>once all program requirements are met and verified</strong>. This is not unconditional and does not replace TikTok''s own policies.</p>\n<h3>Is the TikTok link the only way to apply?</h3>\n<p>No. You may use the <a href=\"https://www.tiktok.com/t/ZS2AxwqsK/\">provided TikTok application link</a> or the <a href=\"/en/programs/tiktok#apply\">agency''s website application form</a>.</p>\n<h3>Will I receive a guaranteed salary or income?</h3>\n<p>This article does not make financial promises. Any program-specific arrangements must be based on confirmed terms.</p>\n<h3>What happens after I apply?</h3>\n<p>The agency reviews your information and may contact you if more details are needed.</p>\n<h3>How do I contact the agency?</h3>\n<p>Use <a href=\"https://wa.me/905011730377\">WhatsApp +905011730377</a> or the <a href=\"/en/contact\">contact page</a>.</p>\n<h2>Start your application</h2>\n<p><strong>Ready to apply?</strong> Use the <a href=\"https://www.tiktok.com/t/ZS2AxwqsK/\">TikTok application link</a> or the <a href=\"/en/programs/tiktok#apply\">HAMZA AGENCY application form</a>, and contact us on <a href=\"https://wa.me/905011730377\">WhatsApp</a> for questions.</p>","seoTitle":"Join HAMZA AGENCY on TikTok LIVE | Guide & Application","seoDescription":"How to join HAMZA AGENCY on TikTok LIVE: conditions, application link, agency form and WhatsApp contact. Conditional acceptance explained.","imageAlt":"ⒽⒶ HAMZA AGENCY logo — TikTok LIVE guide","ogTitle":"Join HAMZA AGENCY on TikTok LIVE","ogDescription":"Application steps, requirements, conditional acceptance and official contact options.","ogImage":"","canonical":"","allowIndex":true},"tr":{"title":"TikTok LIVE için Hamza Ajansı’na Katılın — Şartlar, Avantajlar ve Başvuru","excerpt":"TikTok LIVE için Hamza Ajansı’na başvuru yolları, koşullu kabul ilkesi, başvuru bağlantısı ve WhatsApp iletişim bilgileri.","content":"<p>TikTok LIVE için <strong>Hamza Ajansı</strong> aracılığıyla başvurmayı mı düşünüyorsunuz? Bu rehber başvuru adımlarını, dikkat edilmesi gereken koşulları ve iletişim kanallarını açıklar. Kazanç veya platform sonucu konusunda doğrulanmamış vaatler içermez.</p>\n<h2>Hamza Ajansı hakkında</h2>\n<p><strong>Hamza Ajansı ⒽⒶ</strong>, canlı yayın programlarında içerik üreticileriyle çalışan bir ajanstır. Ajans temsilcisinin adı <strong>⚔عܓོراب✴سܓོوريا⚔</strong> olarak kullanılır. Mevcut seçenekleri görmek için <a href=\"/tr/programs\">programlar sayfasını</a> inceleyebilirsiniz.</p>\n<h2>TikTok LIVE nedir?</h2>\n<p>TikTok LIVE, uygunluk şartlarını karşılayan içerik üreticilerinin izleyicilerle canlı yayın yoluyla etkileşime geçmesini sağlayan bir TikTok özelliğidir. Ajansa katılım, TikTok''un LIVE özelliğini etkinleştirme kararından ayrıdır; platform kurallarının yerine geçmez.</p>\n<h2>Başvuranlar hangi konularda destek alabilir?</h2>\n<ul><li>Başvuru formunun doldurulması ve gerekli bilgilerin hazırlanması konusunda yönlendirme.</li><li>Başvuru soruları için doğrudan iletişim kanalı.</li><li>Gerektiğinde başvurunun takibi ve ek bilgi talebinin iletilmesi.</li><li>Ajansın mevcut programları ve resmi iletişim yolları hakkında bilgilendirme.</li></ul>\n<p>Programa özgü avantajlar güncel ve onaylı şartlara bağlıdır; bu yazı gelir, ödül, izlenme veya takipçi garantisi vermez.</p>\n<h2>Başvuru şartları ve kabul politikası</h2>\n<p>Başvuranların <strong>programın geçerli tüm şartlarını karşılaması</strong>, doğru ve doğrulanabilir bilgiler sağlaması ve ilgili politikalara uyması gerekir. Güncel koşulları kendi durumunuz için ajans ekibinden öğrenebilirsiniz. Bu rehber doğrulanmamış sabit takipçi, yaş, ülke veya yayın hedefleri ileri sürmez.</p>\n<p><strong>Programın tüm şartları karşılandığında ve doğrulandığında kabul garantilidir.</strong> Bu koşullu ajans kabul ilkesi, TikTok''un LIVE erişimi sağlama kararını veya belirli bir gelir elde edilmesini garanti etmez.</p>\n<h2>Nasıl başvurulur?</h2>\n<ol><li>Program bilgilerini ve geçerli şartları inceleyin.</li><li><a href=\"https://www.tiktok.com/t/ZS2AxwqsK/\">Ajansın paylaştığı TikTok başvuru bağlantısını</a> açın ve yönergeleri izleyin.</li><li>Alternatif olarak <a href=\"/tr/programs/tiktok#apply\">Hamza Ajansı web sitesi başvuru formunu</a> kullanın.</li><li>Bilgilerinizi doğru girin; gerektiğinde ekip size ulaşabilir.</li><li>Sorularınız için <a href=\"https://wa.me/905011730377\">WhatsApp: +905011730377</a> üzerinden iletişime geçin.</li></ol>\n<h2>Sık sorulan sorular</h2>\n<h3>Kabul garantili mi?</h3>\n<p>Evet, <strong>programın tüm şartları karşılandığında ve doğrulandığında</strong> kabul garantilidir. Bu, koşulsuz kabul veya TikTok kararlarının yerine geçen bir garanti değildir.</p>\n<h3>Sadece TikTok bağlantısından mı başvurabilirim?</h3>\n<p>Hayır. <a href=\"https://www.tiktok.com/t/ZS2AxwqsK/\">TikTok başvuru bağlantısını</a> veya <a href=\"/tr/programs/tiktok#apply\">ajansın web formunu</a> kullanabilirsiniz.</p>\n<h3>Maaş veya kazanç garantisi var mı?</h3>\n<p>Bu rehber herhangi bir maddi garanti vermez. Programa özgü düzenlemeler ancak doğrulanmış şartlarla açıklanabilir.</p>\n<h3>Başvuru sonrasında ne olur?</h3>\n<p>Bilgiler incelenir, ek bilgi gerekirse sizinle iletişime geçilebilir.</p>\n<h3>Ajansla nasıl iletişime geçebilirim?</h3>\n<p><a href=\"https://wa.me/905011730377\">WhatsApp +905011730377</a> veya <a href=\"/tr/contact\">iletişim sayfasını</a> kullanın.</p>\n<h2>Başvurunuzu başlatın</h2>\n<p><strong>Başvurmaya hazır mısınız?</strong> <a href=\"https://www.tiktok.com/t/ZS2AxwqsK/\">TikTok bağlantısını</a> ya da <a href=\"/tr/programs/tiktok#apply\">Hamza Ajansı başvuru formunu</a> seçin. Sorularınız için <a href=\"https://wa.me/905011730377\">WhatsApp</a> hattımızı kullanın.</p>","seoTitle":"TikTok LIVE için Hamza Ajansı | Başvuru Rehberi","seoDescription":"TikTok LIVE için Hamza Ajansı başvurusu: şartlar, başvuru bağlantısı, web formu, WhatsApp ve koşullu kabul politikası.","imageAlt":"ⒽⒶ Hamza Ajansı logosu — TikTok LIVE rehberi","ogTitle":"TikTok LIVE için Hamza Ajansı’na Katılın","ogDescription":"Başvuru adımları, koşullar, koşullu kabul ve iletişim kanalları.","ogImage":"","canonical":"","allowIndex":true}}}'::jsonb;
  v_tenant uuid;
  v_backup_id uuid;
  v_snapshot jsonb;
  v_post_id bigint;
  v_copy jsonb;
  v_language text;
  v_i integer;
  v_source_id text;
  v_old_revision_id uuid;
  v_source_revision_id uuid;
  v_source_fingerprint text;
  v_source_snapshot jsonb;
  v_field_hash text;
  v_expected_hash text;
  v_old_value text;
  v_new_value text;
  v_field_name text;
  v_new_revision_id uuid;
  v_count integer;
  v_rowcount integer;
  v_first_new_revision uuid;
  v_second_new_revision uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('hamza-agency-pr160-one-time-editorial-release'));
  SELECT t.id INTO STRICT v_tenant
  FROM public.tenants t WHERE t.is_primary IS TRUE AND t.status='active';

  IF EXISTS (SELECT 1 FROM public.activity_logs WHERE action='pr160_once_editorial_release' AND metadata->>'release_key'=v_release_key) THEN
    RAISE EXCEPTION 'One-shot editorial release has already been recorded; refusing to repeat.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.blog_posts WHERE slug='tiktok-live-hamza-agency') THEN
    RAISE EXCEPTION 'TikTok blog slug already exists. Reconcile existing article instead of writing twice.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.content_translation_revisions WHERE source_type='programs' AND source_id IN ('2','3') AND language='tr' AND workflow_status IN ('draft','needs_review','reviewed') AND is_stale IS FALSE) THEN
    RAISE EXCEPTION 'Competing Turkish translation candidates exist; aborting to preserve editors'' work.';
  END IF;
  IF v_draft->>'status' <> 'draft'
     OR v_draft->>'slug' <> 'tiktok-live-hamza-agency'
     OR (SELECT count(*) FROM jsonb_object_keys(v_draft->'translations'))<>3
     OR (SELECT count(*) FROM jsonb_array_elements_text(v_draft->'tags'))<>3 THEN
    RAISE EXCEPTION 'TikTok article structure mismatch.';
  END IF;
  FOREACH v_language IN ARRAY ARRAY['ar','en','tr'] LOOP
    v_copy := v_draft->'translations'->v_language;
    IF v_copy IS NULL
       OR btrim(coalesce(v_copy->>'title',''))=''
       OR btrim(coalesce(v_copy->>'excerpt',''))=''
       OR btrim(coalesce(v_copy->>'content',''))=''
       OR btrim(coalesce(v_copy->>'seoTitle',''))=''
       OR btrim(coalesce(v_copy->>'seoDescription',''))=''
       OR position('https://wa.me/905011730377' IN (v_copy->>'content'))=0
       OR position('https://www.tiktok.com/t/ZS2AxwqsK/' IN (v_copy->>'content'))=0
       OR position('905011730337' IN (v_copy->>'content'))>0
       OR position('⚔عܓོراب✴سܓོوريا⚔' IN (v_copy->>'content'))=0
       OR (v_copy->>'content') ~* '<[[:space:]]*(script|iframe|object|embed|svg|form)'
       OR (v_copy->>'content') ~* 'javascript[[:space:]]*:'
       OR (v_copy->>'allowIndex')::boolean IS DISTINCT FROM TRUE THEN
       RAISE EXCEPTION 'TikTok article not complete or content policy mismatch for %.',v_language;
    END IF;
  END LOOP;

  -- Lock BOTH current revisions and ALL fields; reject changed data in any field.
  FOR v_i IN 1..2 LOOP
    v_source_id := CASE WHEN v_i=1 THEN '2' ELSE '3' END;
    v_old_revision_id := CASE WHEN v_i=1 THEN '3d963d9e-f68a-4130-af4b-ddf803298b19'::uuid ELSE 'a193e789-c0ab-44a7-8b60-2b956b0da1db'::uuid END;
    v_expected_hash := CASE WHEN v_i=1 THEN 'f00c1698a74a2baa0603c11d0ca3a2dea2a818a63b3e222f52db96f74ccdfc47' ELSE '7b4adb6d4f04878f80aaf7e87c5baf39f19d8a6374818636df0bfdc4f339b173' END;
    SELECT r.source_revision_id,s.source_fingerprint,s.source_snapshot
      INTO v_source_revision_id,v_source_fingerprint,v_source_snapshot
    FROM public.content_translation_revisions r
    JOIN public.translation_source_revisions s ON s.id=r.source_revision_id
    WHERE r.id=v_old_revision_id AND r.source_type='programs'
      AND r.source_id=v_source_id AND r.language='tr'
      AND r.workflow_status='published' AND r.is_stale IS FALSE
    FOR UPDATE OF r;
    IF v_source_revision_id IS NULL
       OR v_source_fingerprint IS DISTINCT FROM (CASE WHEN v_i=1 THEN '0e1983b9cd5deffa16903f93bd85e92fabb951784d10ea6d17c4f9e7be98d80a' ELSE '21558fda424bc8a83a14f2d682f621a73a63a8e11f7abff8a7b106f49c87d89e' END) THEN
      RAISE EXCEPTION 'Published revision/source changed for program %.',v_source_id;
    END IF;
    PERFORM 1 FROM public.content_translation_revision_fields f
      WHERE f.translation_revision_id=v_old_revision_id ORDER BY f.field_name FOR UPDATE;
    SELECT count(*),encode(extensions.digest(jsonb_object_agg(f.field_name,f.translated_value)::text,'sha256'),'hex')
      INTO v_count,v_field_hash
    FROM public.content_translation_revision_fields f WHERE f.translation_revision_id=v_old_revision_id;
    IF v_count<>7 OR v_field_hash IS DISTINCT FROM v_expected_hash
       OR (SELECT count(*) FROM jsonb_object_keys(v_source_snapshot))<>7
       OR (SELECT count(*) FROM public.content_translation_revisions r WHERE r.source_type='programs' AND r.source_id=v_source_id AND r.language='tr' AND r.workflow_status='published')<>1 THEN
      RAISE EXCEPTION 'Original translation fields or live revision count changed for program %.',v_source_id;
    END IF;
    v_field_name := CASE WHEN v_i=1 THEN 'summary' ELSE 'faq' END;
    v_old_value := CASE WHEN v_i=1 THEN 'BIGO LIVE programına Hamza Ajansı ara' ELSE E'Programın kamerayla görünürlük gerektiriyor mu?\nHayır, Yaahlan programı sadece sesli yayına dayanmaktadır.' END;
    SELECT f.translated_value INTO STRICT v_new_value
    FROM public.content_translation_revision_fields f
    WHERE f.translation_revision_id=v_old_revision_id AND f.field_name=v_field_name;
    IF v_new_value IS DISTINCT FROM v_old_value THEN
      RAISE EXCEPTION 'The targeted old Turkish phrase is no longer exact for program %.',v_source_id;
    END IF;
  END LOOP;

  IF NOT v_apply THEN
    RAISE NOTICE 'Owner-authorized PR160 one-shot preflight PASS; zero writes.';
    RETURN;
  END IF;

  -- Private, durable, scoped database backup first. Any later error rolls back EVERY write.
  SELECT jsonb_build_object(
    'release_key',v_release_key,'source_sha',v_origin_sha,'captured_at',now(),
    'blog_before',(SELECT coalesce(jsonb_agg(to_jsonb(b)),'[]'::jsonb) FROM public.blog_posts b WHERE b.slug='tiktok-live-hamza-agency'),
    'published_translations_before',(
      SELECT jsonb_agg(jsonb_build_object('revision',to_jsonb(r),'source',to_jsonb(s),
         'fields',(SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.field_name),'[]'::jsonb) FROM public.content_translation_revision_fields f WHERE f.translation_revision_id=r.id)) ORDER BY r.source_id)
      FROM public.content_translation_revisions r JOIN public.translation_source_revisions s ON s.id=r.source_revision_id
      WHERE r.id IN ('3d963d9e-f68a-4130-af4b-ddf803298b19'::uuid,'a193e789-c0ab-44a7-8b60-2b956b0da1db'::uuid)
    )
  ) INTO v_snapshot;
  INSERT INTO public.operations_preflight_backups
    (project_ref,migration_key,created_by,scope,row_counts,snapshot,checksum,notes)
  VALUES ('fvaurkfnsvsfohpzguho',v_release_key,v_actor,
    ARRAY['blog_posts','blog_post_translations','blog_post_versions','translation_source_revisions','content_translation_revisions','content_translation_revision_fields'],
    jsonb_build_object('blog_posts',0,'original_published_translation_revisions',2,'original_translation_fields',14),
    v_snapshot,encode(extensions.digest(v_snapshot::text,'sha256'),'hex'),
    'Owner-approved one-shot editorial release. Scoped recovery snapshot; original revision fields remain immutable.')
  RETURNING id INTO v_backup_id;

  -- A dedicated service actor is recorded as TEXT. No fabricated admin identity or JWT.
  INSERT INTO public.blog_posts(slug,status,category,tags,featured_image_url,author_name,created_by,updated_by)
  VALUES ('tiktok-live-hamza-agency','draft',v_draft->>'category',
    ARRAY(SELECT jsonb_array_elements_text(v_draft->'tags')),
    nullif(v_draft->>'featuredImage',''),v_draft->>'authorName',v_actor,v_actor)
  RETURNING id INTO v_post_id;

  FOREACH v_language IN ARRAY ARRAY['ar','en','tr'] LOOP
    v_copy := v_draft->'translations'->v_language;
    INSERT INTO public.blog_post_translations
      (post_id,language,title,excerpt,content_html,seo_title,seo_description,image_alt,og_title,og_description,og_image_url,canonical_url,allow_index)
    VALUES
      (v_post_id,v_language,v_copy->>'title',v_copy->>'excerpt',v_copy->>'content',
       v_copy->>'seoTitle',v_copy->>'seoDescription',coalesce(v_copy->>'imageAlt',''),
       coalesce(v_copy->>'ogTitle',''),coalesce(v_copy->>'ogDescription',''),
       coalesce(v_copy->>'ogImage',''),coalesce(v_copy->>'canonical',''),TRUE);
  END LOOP;

  -- Preserve the editorial state immediately before the publishing transition.
  INSERT INTO public.blog_post_versions(post_id,version_number,reason,snapshot,created_by)
  VALUES(v_post_id,1,'pr160_pre_publish',
    (SELECT jsonb_build_object('post',to_jsonb(p),'translations',
       (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.language)
        FROM public.blog_post_translations t WHERE t.post_id=p.id))
     FROM public.blog_posts p WHERE p.id=v_post_id),v_actor);
  UPDATE public.blog_posts SET status='published',published_at=now(),updated_at=now(),updated_by=v_actor
  WHERE id=v_post_id AND status='draft';
  GET DIAGNOSTICS v_rowcount=ROW_COUNT;
  IF v_rowcount<>1 THEN RAISE EXCEPTION 'Failed to publish exact blog draft.'; END IF;
  INSERT INTO public.blog_post_versions(post_id,version_number,reason,snapshot,created_by)
  VALUES(v_post_id,2,'pr160_published',
    (SELECT jsonb_build_object('post',to_jsonb(p),'translations',
       (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.language)
        FROM public.blog_post_translations t WHERE t.post_id=p.id))
     FROM public.blog_posts p WHERE p.id=v_post_id),v_actor);

  -- New, explicitly reviewed language revisions; never UPDATE historical field values.
  FOR v_i IN 1..2 LOOP
    v_source_id := CASE WHEN v_i=1 THEN '2' ELSE '3' END;
    v_old_revision_id := CASE WHEN v_i=1 THEN '3d963d9e-f68a-4130-af4b-ddf803298b19'::uuid ELSE 'a193e789-c0ab-44a7-8b60-2b956b0da1db'::uuid END;
    v_field_name := CASE WHEN v_i=1 THEN 'summary' ELSE 'faq' END;
    v_new_value := CASE WHEN v_i=1 THEN 'BIGO LIVE programına Hamza Ajansı aracılığıyla katılın.' ELSE E'Program kamera karşısına geçmeyi gerektiriyor mu?\nHayır, Yaahlan programı yalnızca sesli yayına dayanır.' END;
    SELECT r.source_revision_id INTO STRICT v_source_revision_id FROM public.content_translation_revisions r WHERE r.id=v_old_revision_id;
    INSERT INTO public.content_translation_revisions
      (source_revision_id,source_type,source_id,language,workflow_status,
       supersedes_translation_revision_id,review_notes)
    VALUES
      (v_source_revision_id,'programs',v_source_id,'tr','needs_review',
       v_old_revision_id,'Owner explicitly authorized automated editorial correction on 2026-11-11; service execution, no human identity impersonation.')
    RETURNING id INTO v_new_revision_id;
    INSERT INTO public.content_translation_revision_fields
      (translation_revision_id,field_name,source_value_snapshot,translated_value)
    SELECT v_new_revision_id,f.field_name,f.source_value_snapshot,
      CASE WHEN f.field_name=v_field_name THEN v_new_value ELSE f.translated_value END
    FROM public.content_translation_revision_fields f
    WHERE f.translation_revision_id=v_old_revision_id;
    GET DIAGNOSTICS v_count=ROW_COUNT;
    IF v_count<>7 OR EXISTS (SELECT 1 FROM public.content_translation_revision_fields f WHERE f.translation_revision_id=v_new_revision_id AND btrim(f.translated_value)='') THEN
      RAISE EXCEPTION 'Incomplete new Turkish translation for program %.',v_source_id;
    END IF;
    UPDATE public.content_translation_revisions
      SET workflow_status='reviewed',reviewed_at=now(),review_notes='Owner-approved exact targeted correction via one-shot automation; originals retained.',updated_at=now()
    WHERE id=v_new_revision_id AND workflow_status='needs_review';
    GET DIAGNOSTICS v_rowcount=ROW_COUNT;
    IF v_rowcount<>1 THEN RAISE EXCEPTION 'Failed to review candidate for program %.',v_source_id; END IF;
    UPDATE public.content_translation_revisions
      SET workflow_status='superseded',superseded_at=now(),updated_at=now()
    WHERE id=v_old_revision_id AND workflow_status='published';
    GET DIAGNOSTICS v_rowcount=ROW_COUNT;
    IF v_rowcount<>1 THEN RAISE EXCEPTION 'Failed to retain previous published translation for %.',v_source_id; END IF;
    UPDATE public.content_translation_revisions
      SET workflow_status='published',published_at=now(),updated_at=now()
    WHERE id=v_new_revision_id AND workflow_status='reviewed';
    GET DIAGNOSTICS v_rowcount=ROW_COUNT;
    IF v_rowcount<>1 THEN RAISE EXCEPTION 'Failed to publish approved candidate for %.',v_source_id; END IF;

    INSERT INTO public.activity_logs
      (admin_email,actor_user_id,action,entity_type,entity_id,metadata,source_route,outcome,tenant_id)
    VALUES(NULL,NULL,'pr160_once_translation_published','content_translation_revisions',v_new_revision_id::text,
      jsonb_build_object('actor_type','owner-authorized-service','release_key',v_release_key,
        'before_revision',v_old_revision_id,'after_revision',v_new_revision_id,
        'changed_field',v_field_name,'new_value',v_new_value,'backup_id',v_backup_id,
        'origin_sha',v_origin_sha),
      '/automation/pr160-once','success',v_tenant);
    IF v_i=1 THEN v_first_new_revision:=v_new_revision_id; ELSE v_second_new_revision:=v_new_revision_id; END IF;
  END LOOP;

  -- Verify every committed result within the same atomic transaction.
  IF (SELECT count(*) FROM public.blog_post_translations WHERE post_id=v_post_id AND language IN ('ar','en','tr'))<>3
     OR (SELECT status FROM public.blog_posts WHERE id=v_post_id)<>'published'
     OR (SELECT count(*) FROM public.content_translation_revisions WHERE id IN(v_first_new_revision,v_second_new_revision) AND workflow_status='published')<>2
     OR (SELECT count(*) FROM public.content_translation_revisions WHERE id IN('3d963d9e-f68a-4130-af4b-ddf803298b19'::uuid,'a193e789-c0ab-44a7-8b60-2b956b0da1db'::uuid) AND workflow_status='superseded')<>2 THEN
     RAISE EXCEPTION 'Atomic publication postconditions failed; rollback required.';
  END IF;
  INSERT INTO public.activity_logs
    (admin_email,actor_user_id,action,entity_type,entity_id,metadata,source_route,outcome,tenant_id)
  VALUES(NULL,NULL,'pr160_once_editorial_release','pr160_editorial_release',v_release_key,
    jsonb_build_object('actor_type','owner-authorized-service','release_key',v_release_key,
      'origin_sha',v_origin_sha,'blog_post_id',v_post_id,'revision_ids',jsonb_build_array(v_first_new_revision,v_second_new_revision),
      'backup_id',v_backup_id,'blog_languages',jsonb_build_array('ar','en','tr'),'scope','TikTok post + exactly two Turkish program fields'),
    '/automation/pr160-once','success',v_tenant);
  RAISE NOTICE 'PR160 one-shot release succeeded: blog_post=%, backup=%, translation_revisions=(%,%).',
    v_post_id,v_backup_id,v_first_new_revision,v_second_new_revision;
END
$pr160_once$;
