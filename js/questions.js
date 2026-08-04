// ITパスポート冒険記 - 問題データベース
// 各問題は field(分野) / topic(トピックキー) / topicLabel(表示名) を持つ。
// マップの「ノード」は topic 単位で自動生成される(js/game.js 参照)。
// source が設定されている問題は実際の過去問(出典明記義務あり)。それ以外はオリジナル問題。

const WORLD_META = {
  strategy: { label: "ストラテジの島", color: "#f59e0b", order: 1 },
  management: { label: "マネジメントの谷", color: "#10b981", order: 2 },
  technology: { label: "テクノロジの塔", color: "#6366f1", order: 3 },
};

// トピックの並び順 = マップ上のノード順
const TOPIC_ORDER = {
  strategy: ["keiei", "marketing", "kaikei", "houmu", "gyoumu", "senryaku", "business", "system"],
  management: ["kaihatsu", "pm", "service", "kansa", "keiyaku"],
  technology: ["kiso", "algo", "hardware", "system_kousei", "software", "db", "network", "security"],
};

const TOPIC_LABELS = {
  keiei: "経営戦略・組織", marketing: "マーケティング", kaikei: "会計・財務", houmu: "法務",
  gyoumu: "業務分析・OR/IE", senryaku: "技術戦略・標準化", business: "ビジネスインダストリ", system: "システム戦略・企画",
  kaihatsu: "システム開発技術", pm: "プロジェクトマネジメント", service: "サービスマネジメント",
  kansa: "システム監査・内部統制", keiyaku: "契約・法務実務",
  kiso: "基礎理論", algo: "アルゴリズムとプログラミング", hardware: "コンピュータ構成要素",
  system_kousei: "システム構成要素", software: "ソフトウェア", db: "データベース",
  network: "ネットワーク", security: "セキュリティ",
};

const QUESTIONS = [
// ============ ストラテジ系 ============
// --- 経営戦略・組織 ---
{id:"st-keiei-1",field:"strategy",topic:"keiei",q:"自社の内部環境(強み・弱み)と外部環境(機会・脅威)を整理して経営戦略を検討する分析手法はどれか。",choices:["SWOT分析","PPM分析","3C分析","ファイブフォース分析"],answer:0,explain:"SWOT分析は Strength(強み)・Weakness(弱み)・Opportunity(機会)・Threat(脅威)の4要素で自社を分析する手法。"},
{id:"st-keiei-2",field:"strategy",topic:"keiei",q:"プロダクトポートフォリオマネジメント(PPM)で製品や事業を分類する際の2つの軸はどれか。",choices:["市場成長率と市場占有率","売上高と利益率","投資額と回収期間","品質とコスト"],answer:0,explain:"PPMは「市場成長率」と「市場占有率(シェア)」の2軸で事業を花形・金のなる木・問題児・負け犬に分類する。"},
{id:"st-keiei-3",field:"strategy",topic:"keiei",q:"買収対象企業の経営陣の同意を得ずに株式取得などを進める企業買収(M&A)を何と呼ぶか。",choices:["敵対的買収","友好的買収","マネジメントバイアウト","第三者割当増資"],answer:0,explain:"経営陣の同意なしに進める買収は「敵対的買収」と呼ばれる。"},
{id:"st-keiei-4",field:"strategy",topic:"keiei",q:"複数の事業部門と機能部門の指揮命令系統を組み合わせ、一人の従業員が2人の上司を持つ組織形態はどれか。",choices:["マトリックス組織","機能別組織","事業部制組織","カンパニー制組織"],answer:0,explain:"マトリックス組織は機能別と事業別など複数の指揮系統を組み合わせた組織形態。"},
{id:"st-keiei-5",field:"strategy",topic:"keiei",q:"企業の情報戦略やIT投資に関する最高責任者を表す役職はどれか。",choices:["CIO","CFO","COO","CHRO"],answer:0,explain:"CIO (Chief Information Officer) は情報戦略の最高責任者。CFOは財務、COOは業務執行、CHROは人事の責任者。"},
// --- マーケティング ---
{id:"st-marketing-1",field:"strategy",topic:"marketing",q:"マーケティングミックスの4Pに含まれないものはどれか。",choices:["People(人材)","Product(製品)","Price(価格)","Promotion(販売促進)"],answer:0,explain:"4PはProduct・Price・Place(流通)・Promotionの4つ。People(人)は4Pには含まれない(サービスマーケティングの7Pで追加される要素)。"},
{id:"st-marketing-2",field:"strategy",topic:"marketing",q:"顧客一人ひとりとの関係を管理し、長期的な関係構築を通じて利益向上を図る手法はどれか。",choices:["CRM","SCM","ERP","POS"],answer:0,explain:"CRM (Customer Relationship Management) は顧客関係管理のこと。"},
{id:"st-marketing-3",field:"strategy",topic:"marketing",q:"原材料の調達から製造・在庫・販売までの一連の流れを、企業間で連携し全体最適化する手法はどれか。",choices:["SCM","CRM","BPR","KPI"],answer:0,explain:"SCM (Supply Chain Management) はサプライチェーン(供給連鎖)全体を管理・最適化する手法。"},
{id:"st-marketing-4",field:"strategy",topic:"marketing",q:"新製品の発売当初に高い価格を設定し、早期に開発コストを回収する価格戦略を何と呼ぶか。",choices:["上澄み吸収価格戦略","市場浸透価格戦略","抱き合わせ価格戦略","プレステージ価格戦略"],answer:0,explain:"上澄み吸収価格戦略(スキミングプライス)は発売当初に高価格を設定する戦略。逆に低価格でシェア獲得を狙うのが市場浸透価格戦略。"},
{id:"st-marketing-5",field:"strategy",topic:"marketing",q:"低価格を武器に早期に市場シェアの拡大を狙う価格戦略はどれか。",choices:["市場浸透価格戦略","上澄み吸収価格戦略","バリュープライシング","ダイナミックプライシング"],answer:0,explain:"市場浸透価格戦略(ペネトレーションプライス)は低価格で市場シェアを素早く獲得する戦略。"},
// --- 会計・財務 ---
{id:"st-kaikei-1",field:"strategy",topic:"kaikei",q:"固定費が600万円、変動費率が40%のとき、損益分岐点売上高はいくらか。",choices:["1,000万円","600万円","1,500万円","2,400万円"],answer:0,explain:"損益分岐点売上高 = 固定費 ÷ (1 − 変動費率) = 600万円 ÷ (1 − 0.4) = 600万円 ÷ 0.6 = 1,000万円。"},
{id:"st-kaikei-2",field:"strategy",topic:"kaikei",q:"ある時点での企業の資産・負債・純資産の状態を示す財務諸表はどれか。",choices:["貸借対照表","損益計算書","キャッシュフロー計算書","株主資本等変動計算書"],answer:0,explain:"貸借対照表(B/S)はある時点の財政状態(資産・負債・純資産)を示す。損益計算書(P/L)は一定期間の経営成績を示す。"},
{id:"st-kaikei-3",field:"strategy",topic:"kaikei",q:"取得原価100万円、耐用年数5年、残存価額0円の固定資産を定額法で減価償却するとき、1年あたりの減価償却費はいくらか。",choices:["20万円","10万円","25万円","5万円"],answer:0,explain:"定額法の年間減価償却費 = 取得原価 ÷ 耐用年数 = 100万円 ÷ 5年 = 20万円。"},
{id:"st-kaikei-4",field:"strategy",topic:"kaikei",q:"自己資本に対してどれだけ利益を上げたかを示す財務指標はどれか。",choices:["ROE","ROI","ROA","EPS"],answer:0,explain:"ROE (Return On Equity) は自己資本利益率のこと。当期純利益 ÷ 自己資本 で算出する。"},
{id:"st-kaikei-5",field:"strategy",topic:"kaikei",q:"キャッシュフロー計算書における3つの区分の組合せとして正しいものはどれか。",choices:["営業活動・投資活動・財務活動","営業活動・生産活動・販売活動","収益活動・費用活動・純益活動","流動活動・固定活動・資本活動"],answer:0,explain:"キャッシュフロー計算書は「営業活動」「投資活動」「財務活動」の3区分でキャッシュの増減を示す。"},
// --- 法務 ---
{id:"st-houmu-1",field:"strategy",topic:"houmu",q:"著作権の発生について正しい説明はどれか。",choices:["著作物を創作した時点で自動的に発生する","特許庁への出願・登録によって発生する","公表した時点で初めて発生する","著作権者が申請しないと発生しない"],answer:0,explain:"著作権は特許権と異なり登録などの手続きを必要とせず、著作物を創作した時点で自動的に発生する(無方式主義)。"},
{id:"st-houmu-2",field:"strategy",topic:"houmu",q:"個人情報保護法において、人種・信条・病歴など本人への不当な差別や偏見が生じないよう特に配慮を要する情報を何と呼ぶか。",choices:["要配慮個人情報","個人識別符号","匿名加工情報","仮名加工情報"],answer:0,explain:"要配慮個人情報は人種・信条・病歴・犯罪歴などが該当し、取得には原則本人同意が必要。"},
{id:"st-houmu-3",field:"strategy",topic:"houmu",q:"日本における特許権の存続期間は、原則として出願からどれだけか。",choices:["20年","10年","50年","70年"],answer:0,explain:"特許権の存続期間は原則として出願日から20年。著作権(原則死後70年)と混同しないよう注意。"},
{id:"st-houmu-4",field:"strategy",topic:"houmu",q:"労働者派遣契約と請負契約の違いに関する説明として適切なものはどれか。",choices:["派遣契約では派遣先が労働者に直接指揮命令できるが、請負契約ではできない","請負契約では発注者が労働者に直接指揮命令できる","派遣契約と請負契約に指揮命令権の違いはない","請負契約は必ず1年以内の期間に限られる"],answer:0,explain:"労働者派遣では派遣先企業が労働者に直接指揮命令できるが、請負契約では発注者は請負元の労働者に直接指揮命令できない。"},
{id:"st-houmu-5",field:"strategy",topic:"houmu",q:"不正競争防止法上の「営業秘密」として保護されるための要件に含まれないものはどれか。",choices:["公知性(公然と知られていること)","秘密管理性","有用性","非公知性"],answer:0,explain:"営業秘密の要件は「秘密管理性」「有用性」「非公知性」の3つ。公然と知られていること(公知性)は逆に要件を満たさなくなる条件。"},
// --- 業務分析・OR/IE ---
{id:"st-gyoumu-1",field:"strategy",topic:"gyoumu",q:"項目別のデータを大きい順に並べた棒グラフと累積比率の折れ線を組み合わせ、重点的に管理すべき項目を把握する図はどれか。",choices:["パレート図","ヒストグラム","散布図","レーダーチャート"],answer:0,explain:"パレート図は数値の大きい順に棒グラフを並べ累積比率の折れ線を重ねた図で、ABC分析などに用いられる。"},
{id:"st-gyoumu-2",field:"strategy",topic:"gyoumu",q:"データを一定の区間(階級)に分けて度数を棒グラフで表し、ばらつきや分布の形状を把握するために用いる図はどれか。",choices:["ヒストグラム","パレート図","特性要因図","管理図"],answer:0,explain:"ヒストグラムはデータのばらつき(分布)を視覚的に把握するための図。"},
{id:"st-gyoumu-3",field:"strategy",topic:"gyoumu",q:"限られた経営資源を制約条件の下で最も効果的に配分するための数理的手法はどれか。",choices:["線形計画法","回帰分析","デシジョンツリー","モンテカルロ法"],answer:0,explain:"線形計画法(リニアプログラミング)は制約条件下で目的関数(利益最大化など)を最適化する数理計画手法。"},
{id:"st-gyoumu-4",field:"strategy",topic:"gyoumu",q:"複数の選択肢とその結果を樹形図で表し、期待値を計算して意思決定を支援する手法はどれか。",choices:["デシジョンツリー","親和図法","特性要因図","PDPC法"],answer:0,explain:"デシジョンツリー(決定木)は意思決定の分岐と発生確率・利得を樹形図で表し、期待値を比較する手法。"},
{id:"st-gyoumu-5",field:"strategy",topic:"gyoumu",q:"在庫が一定量(発注点)まで減少した時点で一定量を発注する在庫管理方式はどれか。",choices:["発注点方式","定期発注方式","ジャストインタイム方式","かんばん方式"],answer:0,explain:"発注点方式は在庫量が発注点を下回った時点で発注する方式。定期発注方式は一定周期ごとに必要量を発注する方式。"},
// --- 技術戦略・標準化 ---
{id:"st-senryaku-1",field:"strategy",topic:"senryaku",q:"公的な標準化機関ではなく、市場での競争の結果として広く普及し事実上の標準となった規格を何と呼ぶか。",choices:["デファクトスタンダード","デジュールスタンダード","フォーラム標準","業界ガイドライン"],answer:0,explain:"デファクトスタンダードは市場競争の結果、事実上の標準として広く採用された規格。公的機関が定めるのはデジュールスタンダード。"},
{id:"st-senryaku-2",field:"strategy",topic:"senryaku",q:"財務だけでなく「顧客」「業務プロセス」「学習と成長」を含む4つの視点で経営を評価する手法はどれか。",choices:["バランススコアカード","KPIマネジメント","ベンチマーキング","シックスシグマ"],answer:0,explain:"バランススコアカード(BSC)は財務・顧客・業務プロセス・学習と成長の4視点で戦略を評価・管理する手法。"},
{id:"st-senryaku-3",field:"strategy",topic:"senryaku",q:"製品が市場に投入されてから撤退するまでをたどる、導入期・成長期・成熟期・衰退期の考え方を何と呼ぶか。",choices:["プロダクトライフサイクル","イノベーター理論","キャズム理論","バリューチェーン"],answer:0,explain:"プロダクトライフサイクルは製品の導入期・成長期・成熟期・衰退期という段階的な推移を示すモデル。"},
{id:"st-senryaku-4",field:"strategy",topic:"senryaku",q:"他社が模倣困難な、企業の中核となる独自技術や強みを指す言葉はどれか。",choices:["コアコンピタンス","アウトソーシング","ベンチマーキング","アライアンス"],answer:0,explain:"コアコンピタンスは競合他社に模倣されにくい、企業の中核的な強み・技術力を指す。"},
{id:"st-senryaku-5",field:"strategy",topic:"senryaku",q:"自社内の技術やアイデアだけでなく、社外の技術・知見を積極的に取り込んで新たな価値を創出する考え方はどれか。",choices:["オープンイノベーション","クローズドイノベーション","リバースイノベーション","破壊的イノベーション"],answer:0,explain:"オープンイノベーションは社内外の技術・アイデアを組み合わせて革新を生み出す考え方。"},
// --- ビジネスインダストリ ---
{id:"st-business-1",field:"strategy",topic:"business",q:"様々なモノをインターネットに接続し、データ収集や遠隔制御を行う仕組みを何と呼ぶか。",choices:["IoT","SNS","VR","CAD"],answer:0,explain:"IoT (Internet of Things) はモノがインターネットにつながり情報をやり取りする仕組み。"},
{id:"st-business-2",field:"strategy",topic:"business",q:"金融とITを組み合わせた新しいサービス(スマホ決済や家計簿アプリなど)を総称して何と呼ぶか。",choices:["FinTech","AgriTech","EdTech","HRTech"],answer:0,explain:"FinTechはFinance(金融)とTechnology(技術)を組み合わせた造語。"},
{id:"st-business-3",field:"strategy",topic:"business",q:"事務作業などのパソコン上の定型業務をソフトウェアロボットが代行・自動化する技術を何と呼ぶか。",choices:["RPA","AI","IoT","BPO"],answer:0,explain:"RPA (Robotic Process Automation) はパソコン上の定型業務をソフトウェアロボットが自動実行する技術。"},
{id:"st-business-4",field:"strategy",topic:"business",q:"個人や企業が保有する遊休資産(空き部屋・車など)をインターネットを介して他者に貸し出す経済の仕組みを何と呼ぶか。",choices:["シェアリングエコノミー","ギグエコノミー","サブスクリプション","クラウドファンディング"],answer:0,explain:"シェアリングエコノミーは遊休資産をインターネットのマッチングにより共有・活用する経済モデル。"},
{id:"st-business-5",field:"strategy",topic:"business",q:"インターネットを通じて不特定多数から資金を集める仕組みを何と呼ぶか。",choices:["クラウドファンディング","クラウドコンピューティング","エンジェル投資","ベンチャーキャピタル"],answer:0,explain:"クラウドファンディングは群衆(crowd)と資金調達(funding)を組み合わせた造語で、多数の個人から資金を集める仕組み。"},
// --- システム戦略・企画 ---
{id:"st-system-1",field:"strategy",topic:"system",q:"既存の業務プロセスを情報技術の活用などによって抜本的に見直し、再設計することを何と呼ぶか。",choices:["BPR","ERP","SCM","CRM"],answer:0,explain:"BPR (Business Process Re-engineering) は業務プロセスを根本から見直し再設計する取り組み。"},
{id:"st-system-2",field:"strategy",topic:"system",q:"会計・人事・生産・販売など企業の基幹業務を一元的に管理し、経営資源の全体最適を図るパッケージソフトはどれか。",choices:["ERPパッケージ","グループウェア","SFAツール","BIツール"],answer:0,explain:"ERP (Enterprise Resource Planning) パッケージは企業の基幹業務を統合的に管理するシステム。"},
{id:"st-system-3",field:"strategy",topic:"system",q:"業務処理の単位をサービスとして部品化し、それらを組み合わせてシステムを構築する考え方はどれか。",choices:["SOA","BYOD","EUC","ASP"],answer:0,explain:"SOA (Service Oriented Architecture) はサービス単位で機能を部品化し組み合わせるアーキテクチャの考え方。"},
{id:"st-system-4",field:"strategy",topic:"system",q:"情報システム戦略を策定する際、最初に行うべきこととして最も適切なものはどれか。",choices:["経営戦略・経営目標との整合性を確認する","使用するプログラミング言語を決定する","サーバーの機種を選定する","保守要員を採用する"],answer:0,explain:"情報システム戦略は経営戦略・経営目標に沿って策定される必要があり、まず両者の整合性確認が重要。"},
{id:"st-system-5",field:"strategy",topic:"system",q:"システムの応答速度や可用性など、機能そのものではなくシステムの品質に関する要件を何と呼ぶか。",choices:["非機能要件","機能要件","業務要件","運用要件"],answer:0,explain:"非機能要件は性能・可用性・セキュリティなど「機能以外」の品質に関する要件を指す。"},

// ============ マネジメント系 ============
// --- システム開発技術 ---
{id:"mg-kaihatsu-1",field:"management",topic:"kaihatsu",q:"ウォーターフォール型開発における一般的な工程の順序として正しいものはどれか。",choices:["要件定義→外部設計→内部設計→プログラミング→テスト","プログラミング→要件定義→設計→テスト","テスト→設計→プログラミング→要件定義","外部設計→要件定義→テスト→プログラミング"],answer:0,explain:"ウォーターフォールモデルは要件定義から設計、実装、テストへと上流から下流へ順に進める開発手法。"},
{id:"mg-kaihatsu-2",field:"management",topic:"kaihatsu",q:"プログラムの内部構造(ソースコードのロジック)に着目してテストケースを設計するテスト手法はどれか。",choices:["ホワイトボックステスト","ブラックボックステスト","運用テスト","負荷テスト"],answer:0,explain:"ホワイトボックステストは内部構造・ロジックに着目する手法。入出力のみに着目するのはブラックボックステスト。"},
{id:"mg-kaihatsu-3",field:"management",topic:"kaihatsu",q:"入力と出力の関係にのみ着目し、内部構造を考慮せずにテストケースを設計する手法はどれか。",choices:["ブラックボックステスト","ホワイトボックステスト","トップダウンテスト","単体テスト"],answer:0,explain:"ブラックボックステストは内部構造を意識せず、仕様どおりの入出力になるかを検証する手法。"},
{id:"mg-kaihatsu-4",field:"management",topic:"kaihatsu",q:"ソフトウェアの構造や振る舞いを図で表現するための統一的なモデリング言語はどれか。",choices:["UML","SQL","HTML","XML"],answer:0,explain:"UML (Unified Modeling Language) はクラス図・シーケンス図などでシステムの構造や振る舞いを表現する統一モデリング言語。"},
{id:"mg-kaihatsu-5",field:"management",topic:"kaihatsu",q:"既存のプログラムを解析し、その設計仕様や構造を明らかにする作業を何と呼ぶか。",choices:["リバースエンジニアリング","フォワードエンジニアリング","リエンジニアリング","リファクタリング"],answer:0,explain:"リバースエンジニアリングは既存の成果物(プログラム等)を解析し設計情報を導き出す作業。"},
{id:"mg-kaihatsu-6",field:"management",topic:"kaihatsu",q:"開発チームと運用チームが連携し、ツールや自動化によって開発から運用までのサイクルを高速化する考え方はどれか。",choices:["DevOps","ITIL","BCP","PDCA"],answer:0,explain:"DevOpsはDevelopment(開発)とOperations(運用)を組み合わせ、両者が連携して開発・運用サイクルを高速化する文化・手法。"},
{id:"mg-kaihatsu-7",field:"management",topic:"kaihatsu",q:"プログラムを変更した際、その変更が既存の機能に悪影響(デグレード)を及ぼしていないかを確認するテストを何と呼ぶか。",choices:["リグレッションテスト(回帰テスト)","単体テスト","結合テスト","受け入れテスト"],answer:0,explain:"リグレッションテスト(回帰テスト)は変更によって既存機能に悪影響が出ていないかを確認するテスト。"},
{id:"mg-kaihatsu-8",field:"management",topic:"kaihatsu",q:"複数のモジュールを結合し、モジュール間のインタフェースが仕様どおりに連携するかを確認するテスト工程はどれか。",choices:["結合テスト","単体テスト","システムテスト","運用テスト"],answer:0,explain:"結合テストは複数のモジュールを組み合わせ、インタフェースの整合性やデータの受け渡しを確認する工程。"},
// --- プロジェクトマネジメント ---
{id:"mg-pm-1",field:"management",topic:"pm",q:"プロジェクトで実施すべき作業を階層的に分解し、管理可能な単位まで細分化した図はどれか。",choices:["WBS","ガントチャート","PERT図","組織図"],answer:0,explain:"WBS (Work Breakdown Structure) はプロジェクトの作業を階層的に分解した構成図。"},
{id:"mg-pm-2",field:"management",topic:"pm",q:"作業の順序関係を矢印で表し、プロジェクト全体の所要期間に影響を与える最も長い経路を何と呼ぶか。",choices:["クリティカルパス","バッファパス","メインルート","ボトルネック工程"],answer:0,explain:"クリティカルパスはPERT図(アローダイアグラム)上で、開始から終了までの最も所要日数が長い経路であり、遅延がそのままプロジェクト全体の遅延につながる。"},
{id:"mg-pm-3",field:"management",topic:"pm",q:"プロジェクトマネジメントにおいて特にバランスを取るべき3つの制約(トリプルコンストレイント)の組合せはどれか。",choices:["品質・コスト・納期(スコープ)","人員・設備・予算","要件・設計・実装","品質・人員・環境"],answer:0,explain:"プロジェクトの3大制約はQ(品質)・C(コスト)・D(納期、スコープを含む)であり、これらはトレードオフの関係にある。"},
{id:"mg-pm-4",field:"management",topic:"pm",q:"プロジェクトの結果によって影響を受ける、あるいは影響を与える顧客・経営者・利用者などの関係者を総称して何と呼ぶか。",choices:["ステークホルダ","エンドユーザー","プロジェクトオーナー","スポンサー"],answer:0,explain:"ステークホルダはプロジェクトに利害関係を持つすべての関係者(顧客、経営層、利用者、協力会社等)を指す。"},
{id:"mg-pm-5",field:"management",topic:"pm",q:"プロジェクトのリスクへの対応策のうち、リスクの原因となる活動自体を取りやめる対応を何と呼ぶか。",choices:["リスク回避","リスク転嫁","リスク低減","リスク受容"],answer:0,explain:"リスク回避は、リスクの原因となる活動そのものを中止・変更してリスクの発生を防ぐ対応。保険加入などはリスク転嫁にあたる。"},
{id:"mg-pm-6",field:"management",topic:"pm",q:"各作業の開始日・終了日を横棒で表し、進捗状況を視覚的に把握するための図はどれか。",choices:["ガントチャート","PERT図","特性要因図","レーダーチャート"],answer:0,explain:"ガントチャートは横軸に時間、縦軸に作業項目を取り、各作業のスケジュールを棒グラフで表す図。"},
{id:"mg-pm-7",field:"management",topic:"pm",q:"プロジェクトの目的達成に必要な作業範囲を明確にし、それ以外の作業が無秩序に追加されないよう管理することを何と呼ぶか。",choices:["スコープマネジメント","タイムマネジメント","コストマネジメント","品質マネジメント"],answer:0,explain:"スコープマネジメントはプロジェクトで実施する作業範囲(スコープ)を定義し管理すること。"},
{id:"mg-pm-8",field:"management",topic:"pm",q:"作業A(3日)の後に作業B(5日)と作業C(2日)→作業D(4日)が並行して進む場合、プロジェクト全体の所要日数は何日か。",choices:["9日","8日","5日","3日"],answer:0,explain:"経路1: A+B=3+5=8日、経路2: A+C+D=3+2+4=9日。プロジェクト全体の所要日数は最も長い経路(クリティカルパス)の日数である9日となる。"},
// --- サービスマネジメント ---
{id:"mg-service-1",field:"management",topic:"service",q:"ITサービスマネジメントにおけるベストプラクティス集として広く知られているフレームワークはどれか。",choices:["ITIL","UML","CMMI","ISO 9001"],answer:0,explain:"ITIL (Information Technology Infrastructure Library) はITサービスマネジメントのベストプラクティス集。"},
{id:"mg-service-2",field:"management",topic:"service",q:"サービス提供者と利用者の間で、提供するサービスの品質水準について合意した文書を何と呼ぶか。",choices:["SLA","NDA","RFP","MOU"],answer:0,explain:"SLA (Service Level Agreement) はサービスの品質・範囲・可用性などについて提供者と利用者が合意する文書。"},
{id:"mg-service-3",field:"management",topic:"service",q:"サービス運用中に発生した個々の障害への迅速な対応と、その根本原因の究明・恒久対策の検討をそれぞれ担うプロセスの組合せはどれか。",choices:["インシデント管理と問題管理","変更管理とリリース管理","構成管理と資産管理","可用性管理と容量管理"],answer:0,explain:"インシデント管理は目の前の障害を迅速に復旧させることを目的とし、問題管理はその根本原因を調査し再発防止を図る。"},
{id:"mg-service-4",field:"management",topic:"service",q:"データセンターにおける電源設備や空調設備など、施設・設備面の管理を何と呼ぶか。",choices:["ファシリティマネジメント","キャパシティマネジメント","コンフィギュレーションマネジメント","リリースマネジメント"],answer:0,explain:"ファシリティマネジメントは建物・電源・空調など物理的な設備・施設を管理すること。"},
{id:"mg-service-5",field:"management",topic:"service",q:"バックアップデータを世代ごとに管理し、複数世代前のデータへ復旧できるようにする管理方式を何と呼ぶか。",choices:["世代管理","差分管理","増分管理","冗長管理"],answer:0,explain:"世代管理はバックアップを複数世代(直近だけでなく過去の複数時点分)保持し、必要な時点のデータに戻せるようにする管理方式。"},
{id:"mg-service-6",field:"management",topic:"service",q:"利用者からの問い合わせやトラブル報告を一元的に受け付ける窓口を何と呼ぶか。",choices:["サービスデスク(ヘルプデスク)","システム監査室","品質保証部","コールセンター専用回線"],answer:0,explain:"サービスデスク(ヘルプデスク)は利用者からの問い合わせやインシデント報告の一元窓口となる。"},
{id:"mg-service-7",field:"management",topic:"service",q:"1年間(8,760時間)のうち、故障などで停止していた時間が876時間であった場合の稼働率(可用性)はおよそ何%か。",choices:["約90%","約95%","約80%","約99%"],answer:0,explain:"稼働率 = (総時間 − 停止時間) ÷ 総時間 = (8760 − 876) ÷ 8760 ≒ 0.9 → 約90%。"},
{id:"mg-service-8",field:"management",topic:"service",q:"複数の拠点にあるサービスデスクを統合せず、利用者の言語や地域ごとに個別配置する形態を何と呼ぶか。",choices:["ローカルサービスデスク","中央サービスデスク","バーチャルサービスデスク","フォロー・ザ・サン"],answer:0,explain:"ローカルサービスデスクは利用者の近くに個別に設置される形態。中央サービスデスクは1拠点に集約する形態。"},
// --- システム監査・内部統制 ---
{id:"mg-kansa-1",field:"management",topic:"kansa",q:"情報システムが安全・効率的に運用されているかを、独立した第三者的立場から検証・評価する活動を何と呼ぶか。",choices:["システム監査","システム運用","システム開発","システム設計"],answer:0,explain:"システム監査は独立した立場の監査人が情報システムのリスクや統制状況を検証・評価する活動。"},
{id:"mg-kansa-2",field:"management",topic:"kansa",q:"システム監査を行う監査人にとって特に重要とされる要件はどれか。",choices:["被監査部門からの独立性","被監査部門の業務への精通","開発言語の習熟度","経営層との親密な関係"],answer:0,explain:"システム監査人には被監査部門としがらみのない「独立性」と「客観性」が強く求められる。"},
{id:"mg-kansa-3",field:"management",topic:"kansa",q:"企業が業務を適正・効率的に遂行するために整備する内部統制の目的に含まれないものはどれか。",choices:["株価の最大化","業務の有効性及び効率性","財務報告の信頼性","法令等の遵守(コンプライアンス)"],answer:0,explain:"内部統制の目的は一般に「業務の有効性・効率性」「財務報告の信頼性」「法令遵守」「資産の保全」とされ、株価の最大化そのものは目的ではない。"},
{id:"mg-kansa-4",field:"management",topic:"kansa",q:"情報セキュリティの3要素(機密性・完全性・可用性)のうち、「認可された者だけが情報にアクセスできる状態」を指すものはどれか。",choices:["機密性","完全性","可用性","責任追跡性"],answer:0,explain:"機密性(Confidentiality)は許可された者だけが情報にアクセスできることを指す。改ざんされていない状態は完全性、必要な時に使える状態は可用性。"},
{id:"mg-kansa-5",field:"management",topic:"kansa",q:"システム監査において、処理の実行記録として不正や誤りの追跡調査に用いられる記録を何と呼ぶか。",choices:["監査証跡(ログ)","バックアップファイル","構成管理台帳","仕様書"],answer:0,explain:"監査証跡(ログ)は処理の実行履歴を記録したもので、不正や誤りの発生有無を追跡する際の重要な証拠となる。"},
{id:"mg-kansa-6",field:"management",topic:"kansa",q:"不正や誤りが発生する前にそれを未然に防ぐための統制を何と呼ぶか。",choices:["予防的統制","発見的統制","是正的統制","補完的統制"],answer:0,explain:"予防的統制は不正・誤りの発生を未然に防ぐための仕組み(アクセス権限の制限など)。発見的統制は発生後に検知するための仕組み。"},
{id:"mg-kansa-7",field:"management",topic:"kansa",q:"企業が法令・社内規則・社会規範を遵守して活動することを何と呼ぶか。",choices:["コンプライアンス","アカウンタビリティ","トレーサビリティ","ガバナンス"],answer:0,explain:"コンプライアンスは法令や規範の遵守を意味する。"},
{id:"mg-kansa-8",field:"management",topic:"kansa",q:"経営者が企業の情報システムに関する投資や活用を適切に管理・統制する仕組みを何と呼ぶか。",choices:["ITガバナンス","ITILプロセス","BCP","SLM"],answer:0,explain:"ITガバナンスは経営者がIT戦略・投資・リスクを適切に統制する仕組みを指す。"},
// --- 契約・法務実務 ---
{id:"mg-keiyaku-1",field:"management",topic:"keiyaku",q:"成果物の完成を約束し、その対価として報酬が支払われる契約形態はどれか。",choices:["請負契約","準委任契約","労働者派遣契約","業務提携契約"],answer:0,explain:"請負契約は仕事の完成を目的とし、成果物に対して報酬が支払われる契約。準委任契約は業務の遂行自体を目的とし、成果物の完成義務は負わない。"},
{id:"mg-keiyaku-2",field:"management",topic:"keiyaku",q:"成果物の完成義務は負わず、善良な管理者の注意をもって業務を遂行すること自体を目的とする契約形態はどれか。",choices:["準委任契約","請負契約","労働者派遣契約","売買契約"],answer:0,explain:"準委任契約は成果物の完成を約束するものではなく、業務の遂行(役務提供)そのものを目的とする契約。システム開発の設計支援などで用いられることが多い。"},
{id:"mg-keiyaku-3",field:"management",topic:"keiyaku",q:"取引によって知り得た相手方の秘密情報を第三者に漏らさないことを定める契約を何と呼ぶか。",choices:["秘密保持契約(NDA)","労働契約","賃貸借契約","売買契約"],answer:0,explain:"NDA (Non-Disclosure Agreement) は秘密保持契約のこと。業務委託などの前に締結されることが多い。"},
{id:"mg-keiyaku-4",field:"management",topic:"keiyaku",q:"委託先の技術者が委託元に常駐し、委託元の指揮命令を受けずに自社の指揮下で業務を行う契約形態に最も近いものはどれか。",choices:["準委任契約(SES契約)","労働者派遣契約","出向","請負契約(成果完成型)"],answer:0,explain:"SES(システムエンジニアリングサービス)契約は準委任契約の一種で、技術者は委託元に常駐しても指揮命令は自社(委託先)から受ける点が労働者派遣と異なる。"},
{id:"mg-keiyaku-5",field:"management",topic:"keiyaku",q:"システム開発を発注者から受託した場合、原則として成果物の著作権は誰に帰属するか(契約に特段の定めがない場合)。",choices:["開発を行った受託者(制作者)","発注者","発注者と受託者の共有","著作権は発生しない"],answer:0,explain:"契約で特段の定めがない限り、著作権は現に創作した者(受託者)に帰属するのが原則。発注者に譲渡したい場合は契約書で明記する必要がある。"},
{id:"mg-keiyaku-6",field:"management",topic:"keiyaku",q:"労働者派遣における指揮命令権について正しい説明はどれか。",choices:["派遣先企業が派遣労働者に対して直接指揮命令を行う","派遣元企業のみが指揮命令を行い、派遣先は一切関与できない","指揮命令権は労働者本人が持つ","指揮命令権は労働基準監督署が持つ"],answer:0,explain:"労働者派遣では、雇用契約は派遣元と結ぶが、実際の指揮命令は派遣先企業が行う点が大きな特徴。"},
{id:"mg-keiyaku-7",field:"management",topic:"keiyaku",q:"納品されたソフトウェアが契約内容に適合しない(不具合がある等)場合に、発注者が請負業者に修補や損害賠償等を求められる責任を何と呼ぶか。",choices:["契約不適合責任","製造物責任","善管注意義務違反","瑕疵担保責任(旧民法用語のみ)"],answer:0,explain:"2020年施行の改正民法により「瑕疵担保責任」は「契約不適合責任」という呼称・枠組みに整理された。"},
{id:"mg-keiyaku-8",field:"management",topic:"keiyaku",q:"資本力の大きい親事業者が、下請事業者に対して不当に代金を減額するなどの行為を規制する法律はどれか。",choices:["下請代金支払遅延等防止法(下請法)","独占禁止法の全条項","労働基準法","消費者契約法"],answer:0,explain:"下請法は親事業者による代金の不当な減額・支払遅延などから下請事業者を保護するための法律(独占禁止法を補完する特別法)。"},

// ============ テクノロジ系 ============
// --- 基礎理論 ---
{id:"te-kiso-1",field:"technology",topic:"kiso",q:"2進数の「1011」を10進数に変換するといくらになるか。",choices:["11","9","13","10"],answer:0,explain:"1011(2) = 1×2^3 + 0×2^2 + 1×2^1 + 1×2^0 = 8+0+2+1 = 11。"},
{id:"te-kiso-2",field:"technology",topic:"kiso",q:"2つの入力がともに1のときだけ出力が1になる論理演算はどれか。",choices:["AND(論理積)","OR(論理和)","NOT(否定)","XOR(排他的論理和)"],answer:0,explain:"AND(論理積)は両方の入力が1のときのみ出力が1になる。ORはどちらか一方でも1なら出力1。"},
{id:"te-kiso-3",field:"technology",topic:"kiso",q:"窓口の数や待ち時間など、サービスを待つ現象を数理的に分析する理論を何と呼ぶか。",choices:["待ち行列理論","線形計画法","確率分布理論","グラフ理論"],answer:0,explain:"待ち行列理論(キューイング理論)は窓口数と到着率・サービス率などから待ち時間や行列の長さを分析する理論。"},
{id:"te-kiso-4",field:"technology",topic:"kiso",q:"データ伝送時に発生した誤りを検出するために、送信データに付加する冗長なビットを何と呼ぶか。",choices:["パリティビット","チェックデジット","シフトビット","フラグビット"],answer:0,explain:"パリティビットは1の個数の偶奇を利用して伝送誤りを検出するための冗長ビット。"},
{id:"te-kiso-5",field:"technology",topic:"kiso",q:"2進数の「A」を16進数1桁で表すと、10進数のいくつに相当するか。",choices:["10","11","12","9"],answer:0,explain:"16進数のA〜Fはそれぞれ10進数の10〜15を表す。Aは10進数の10。"},
// --- アルゴリズムとプログラミング ---
{id:"te-algo-1",field:"technology",topic:"algo",q:"フローチャートにおいて、条件によって処理の流れを分岐させる記号の形状はどれか。",choices:["ひし形(判断記号)","長方形(処理記号)","平行四辺形(入出力記号)","円(端子記号)"],answer:0,explain:"ひし形は条件分岐(判断)を表す記号。長方形は処理、平行四辺形は入出力、丸(角丸長方形)は開始・終了の端子記号。"},
{id:"te-algo-2",field:"technology",topic:"algo",q:"隣り合う要素を比較して大小関係が逆であれば入れ替える操作を繰り返す、基本的なソートアルゴリズムはどれか。",choices:["バブルソート","2分探索","ハッシュ法","線形探索"],answer:0,explain:"バブルソートは隣接する要素の比較・交換を繰り返してデータを並び替える基本的なソートアルゴリズム。"},
{id:"te-algo-3",field:"technology",topic:"algo",q:"整列済みのデータに対して、探索範囲を半分に絞り込みながら目的のデータを探す方法はどれか。",choices:["2分探索(binary search)","線形探索(逐次探索)","ハッシュ探索","深さ優先探索"],answer:0,explain:"2分探索は整列済みデータの中央値と比較し、探索範囲を半分ずつに絞り込んでいく効率的な探索法。"},
{id:"te-algo-4",field:"technology",topic:"algo",q:"プログラムの中で値を格納するための名前付きの領域を何と呼ぶか。",choices:["変数","定数","関数","配列(のみ)"],answer:0,explain:"変数はプログラム内で値を一時的に格納し、後から書き換え可能な名前付き領域。"},
{id:"te-algo-5",field:"technology",topic:"algo",q:"変数xに1、変数yに2を代入した後、x ← x + y を実行すると、xの値はいくつになるか。",choices:["3","1","2","0"],answer:0,explain:"x←x+y は現在のxの値(1)にyの値(2)を加えて代入するので、x=1+2=3となる。"},
// --- コンピュータ構成要素 ---
{id:"te-hardware-1",field:"technology",topic:"hardware",q:"コンピュータの中心となり、演算と制御の機能を担う装置はどれか。",choices:["CPU","メモリ","HDD","電源ユニット"],answer:0,explain:"CPU(中央処理装置)は演算装置と制御装置から構成され、コンピュータの中心的な処理を担う。"},
{id:"te-hardware-2",field:"technology",topic:"hardware",q:"電源を切るとデータが消えてしまう、CPUが直接読み書きする主記憶装置はどれか。",choices:["RAM","ROM","SSD","磁気テープ"],answer:0,explain:"RAM(Random Access Memory)は主記憶装置として使われ、電源を切ると内容が消える揮発性メモリ。ROMは不揮発性。"},
{id:"te-hardware-3",field:"technology",topic:"hardware",q:"CPUと主記憶装置の速度差を埋めるために、CPUに近い位置に置かれる高速・小容量のメモリを何と呼ぶか。",choices:["キャッシュメモリ","仮想メモリ","レジスタ以外の補助記憶","ROM"],answer:0,explain:"キャッシュメモリはCPUと主記憶の速度差を埋めるために設けられる高速・小容量のメモリ。"},
{id:"te-hardware-4",field:"technology",topic:"hardware",q:"駆動部分がなく、フラッシュメモリを用いた高速・省電力な補助記憶装置はどれか。",choices:["SSD","HDD","DVD-ROM","フロッピーディスク"],answer:0,explain:"SSD(Solid State Drive)は駆動部分を持たないフラッシュメモリベースの補助記憶装置で、HDDより高速・耐衝撃性に優れる。"},
{id:"te-hardware-5",field:"technology",topic:"hardware",q:"1つのCPUパッケージ内に複数の演算処理コアを搭載し、並列処理性能を高めた構成を何と呼ぶか。",choices:["マルチコア","マルチキャスト","マルチテナント","マルチプロトコル"],answer:0,explain:"マルチコアは1つのCPU内に複数の処理コアを持たせ、並列処理によって性能向上を図る構成。"},
// --- システム構成要素 ---
{id:"te-system_kousei-1",field:"technology",topic:"system_kousei",q:"サービスを提供するサーバーと、それを利用するクライアントの役割を分離したシステム構成を何と呼ぶか。",choices:["クライアントサーバシステム","ピアツーピアシステム","バッチ処理システム","スタンドアロンシステム"],answer:0,explain:"クライアントサーバシステムはサービスを提供する「サーバー」と要求する「クライアント」に役割分担したシステム構成。"},
{id:"te-system_kousei-2",field:"technology",topic:"system_kousei",q:"1台の物理的なコンピュータ上に、複数の仮想的なコンピュータ環境を作り出す技術を何と呼ぶか。",choices:["仮想化","クラスタリング","ロードバランシング","デュプレックス化"],answer:0,explain:"仮想化は1台の物理サーバー上で複数の独立した仮想マシン(OS環境)を動作させる技術。"},
{id:"te-system_kousei-3",field:"technology",topic:"system_kousei",q:"OSやミドルウェアを含むアプリケーション実行環境そのものをインターネット経由で提供するクラウドサービスの形態はどれか。",choices:["PaaS","SaaS","IaaS","DaaS"],answer:0,explain:"PaaS (Platform as a Service) はアプリケーションの実行環境(プラットフォーム)を提供する。SaaSはソフトウェア、IaaSはインフラを提供する。"},
{id:"te-system_kousei-4",field:"technology",topic:"system_kousei",q:"同一構成の機器を2系統用意し、片方が故障してももう一方で処理を継続できるようにする方式を何と呼ぶか。",choices:["デュプレックスシステム(冗長化構成)","シングル構成","スタンドアロン構成","バッチ構成"],answer:0,explain:"デュプレックスシステムのように機器を二重化(冗長化)することで、片方の故障時にもサービスを継続できるようにする。"},
{id:"te-system_kousei-5",field:"technology",topic:"system_kousei",q:"処理能力を高めるために、サーバーの台数を増やして負荷を分散させる方式を何と呼ぶか。",choices:["スケールアウト","スケールアップ","スケールダウン","スケールイン(単独では意味が異なる)"],answer:0,explain:"スケールアウトはサーバーの「台数」を増やして処理能力を高める方式。既存サーバー自体の性能を上げるのはスケールアップ。"},
// --- ソフトウェア ---
{id:"te-software-1",field:"technology",topic:"software",q:"コンピュータのハードウェア資源を管理し、アプリケーションソフトウェアの実行環境を提供する基本ソフトウェアを何と呼ぶか。",choices:["OS(オペレーティングシステム)","ミドルウェア","デバイスドライバ","ファームウェア(限定的)"],answer:0,explain:"OSはメモリ管理・タスク管理・ファイル管理などハードウェア資源を管理し、アプリケーションの実行基盤となる基本ソフトウェア。"},
{id:"te-software-2",field:"technology",topic:"software",q:"ファイルの種類を識別するために、ファイル名の末尾に付与される「.txt」や「.jpg」などの文字列を何と呼ぶか。",choices:["拡張子","ディレクトリ","パス","シンボリックリンク"],answer:0,explain:"拡張子はファイルの種類を識別するためにファイル名の末尾に付けられる文字列。"},
{id:"te-software-3",field:"technology",topic:"software",q:"1台のコンピュータで複数のプログラムを切り替えながら同時に実行しているように見せる処理方式を何と呼ぶか。",choices:["マルチタスク","マルチキャスト","マルチメディア","マルチプレクサ"],answer:0,explain:"マルチタスクはCPU時間を短時間で切り替えることで、複数のプログラムが同時に実行されているように見せる方式。"},
{id:"te-software-4",field:"technology",topic:"software",q:"ソースコードが公開されており、利用者が改変や再配布を行える形で提供されるソフトウェアを何と呼ぶか。",choices:["オープンソースソフトウェア(OSS)","フリーウェア(必ずしもソース公開とは限らない)","シェアウェア","ファームウェア"],answer:0,explain:"オープンソースソフトウェアはソースコードが公開され、一定のライセンスの下で改変・再配布が認められているソフトウェア。"},
{id:"te-software-5",field:"technology",topic:"software",q:"OSとアプリケーションソフトウェアの間に位置し、データベース接続や通信機能など共通的な機能を提供するソフトウェアを何と呼ぶか。",choices:["ミドルウェア","ファームウェア","ハイパーバイザ","デバイスドライバ"],answer:0,explain:"ミドルウェアはOSとアプリケーションの中間に位置し、共通的な機能(DB接続等)を提供するソフトウェア。"},
// --- データベース ---
{id:"te-db-1",field:"technology",topic:"db",q:"データの重複や矛盾を排除し、更新時の不整合を防ぐためにテーブル構造を整理する作業を何と呼ぶか。",choices:["正規化","インデックス化","仮想化","暗号化"],answer:0,explain:"正規化はデータの重複や更新時の不整合を防ぐために、テーブル構造を整理する設計手法。"},
{id:"te-db-2",field:"technology",topic:"db",q:"テーブル内の各行(レコード)を一意に識別するための項目を何と呼ぶか。",choices:["主キー","外部キー","インデックス","ビュー"],answer:0,explain:"主キーはテーブル内の各レコードを一意に識別するための項目(列)。他のテーブルの主キーを参照する項目は外部キー。"},
{id:"te-db-3",field:"technology",topic:"db",q:"データベースから条件に合うデータを取り出すSQL文はどれか。",choices:["SELECT文","INSERT文","UPDATE文","DELETE文"],answer:0,explain:"SELECT文はテーブルから条件に合致するデータを検索・取得するためのSQL文。INSERTは追加、UPDATEは更新、DELETEは削除。"},
{id:"te-db-4",field:"technology",topic:"db",q:"データベース設計において、実体(エンティティ)同士の関連を図示するために用いられる図はどれか。",choices:["ER図(実体関連図)","フローチャート","UML配置図","ガントチャート"],answer:0,explain:"ER図(Entity Relationship Diagram)はエンティティ(実体)とその関連(リレーションシップ)を図示する設計手法。"},
{id:"te-db-5",field:"technology",topic:"db",q:"データベースのトランザクション処理が満たすべき性質(原子性・一貫性・独立性・永続性)の総称はどれか。",choices:["ACID特性","CAP定理","BASE特性","ISO/IEC特性"],answer:0,explain:"ACID特性はAtomicity(原子性)・Consistency(一貫性)・Isolation(独立性)・Durability(永続性)の頭文字を取ったもの。"},
// --- ネットワーク ---
{id:"te-network-1",field:"technology",topic:"network",q:"インターネットにおける標準的な通信プロトコル群を総称して何と呼ぶか。",choices:["TCP/IP","HTML/CSS","USB/HDMI","SMTP/POP"],answer:0,explain:"TCP/IPはインターネットで広く使われる標準的な通信プロトコル群の総称。"},
{id:"te-network-2",field:"technology",topic:"network",q:"IPアドレスにおいて、ネットワーク部とホスト部の境界を示すために用いられるものはどれか。",choices:["サブネットマスク","MACアドレス","ポート番号","デフォルトゲートウェイ(の値そのものではない)"],answer:0,explain:"サブネットマスクはIPアドレスのうちどこまでがネットワーク部でどこからがホスト部かを示すために用いられる。"},
{id:"te-network-3",field:"technology",topic:"network",q:"会社や学校など、限られた範囲内に構築されるネットワークを何と呼ぶか。",choices:["LAN","WAN","VPN(単独では範囲を示さない)","ISP"],answer:0,explain:"LAN (Local Area Network) は建物内や敷地内など限られた範囲のネットワーク。広域にわたるものはWAN (Wide Area Network)。"},
{id:"te-network-4",field:"technology",topic:"network",q:"Webページの通信を暗号化して安全にやり取りするために用いられるプロトコルはどれか。",choices:["HTTPS","HTTP","FTP","Telnet"],answer:0,explain:"HTTPS(HTTP over SSL/TLS)はHTTP通信を暗号化し、盗聴や改ざんを防ぐためのプロトコル。"},
{id:"te-network-5",field:"technology",topic:"network",q:"無線LANの暗号化方式のうち、WEPよりも安全性が高いとされる比較的新しい規格はどれか。",choices:["WPA3","WEP","ARP","DHCP(暗号化方式ではない)"],answer:0,explain:"WPA3はWEPやWPA2よりも新しく、より強固な暗号化方式を採用した無線LANセキュリティ規格。"},
// --- セキュリティ ---
{id:"te-security-1",field:"technology",topic:"security",q:"暗号化と復号に同じ鍵を用いる暗号方式を何と呼ぶか。",choices:["共通鍵暗号方式","公開鍵暗号方式","ハッシュ関数","デジタル署名"],answer:0,explain:"共通鍵暗号方式は暗号化と復号に同一の鍵を使う方式で、処理は高速だが鍵の受け渡し(鍵配送)に課題がある。"},
{id:"te-security-2",field:"technology",topic:"security",q:"感染したコンピュータのファイルを勝手に暗号化し、復号と引き換えに金銭を要求するマルウェアを何と呼ぶか。",choices:["ランサムウェア","スパイウェア","アドウェア","ワーム(それ自体は自己増殖するもの)"],answer:0,explain:"ランサムウェアはファイルを暗号化するなどして使用不能にし、復旧と引き換えに身代金(ランサム)を要求するマルウェア。"},
{id:"te-security-3",field:"technology",topic:"security",q:"パスワードに加えて、スマートフォンへの通知や指紋認証など異なる要素を組み合わせて認証を行う方式を何と呼ぶか。",choices:["多要素認証","シングルサインオン","バイオメトリクス認証(単独の一手段)","ワンタイムパスワード(単独の一手段)"],answer:0,explain:"多要素認証は「知識情報(パスワード)」「所持情報(スマホ等)」「生体情報(指紋等)」のうち複数種類を組み合わせて認証する方式。"},
{id:"te-security-4",field:"technology",topic:"security",q:"内部ネットワークと外部ネットワークの境界に設置し、あらかじめ定めたルールに基づいて通信を許可・遮断する仕組みを何と呼ぶか。",choices:["ファイアウォール","ルーター(単体では制御が主目的ではない)","ハブ","スイッチ"],answer:0,explain:"ファイアウォールは内部・外部ネットワークの境界で通信を監視し、不正なアクセスを遮断するための仕組み。"},
{id:"te-security-5",field:"technology",topic:"security",q:"技術的な手段ではなく、人の心理的な隙や不注意につけ込んで機密情報を盗み出す攻撃手法を何と呼ぶか。",choices:["ソーシャルエンジニアリング","ブルートフォース攻撃","SQLインジェクション","DoS攻撃"],answer:0,explain:"ソーシャルエンジニアリングはなりすまし電話や肩越しの盗み見(ショルダーハッキング)など、人的な隙を突いて情報を盗む手法。"},
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { QUESTIONS, WORLD_META, TOPIC_ORDER, TOPIC_LABELS };
}
