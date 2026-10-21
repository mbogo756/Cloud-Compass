// Prototype question bank. Original wording, reviewed for this project.
// Not Microsoft-approved. Kept separate from UI and scoring logic.

export type Domain = "cloud-concepts" | "architecture-services" | "management-governance";

export const DOMAINS: { id: Domain; label: string }[] = [
  { id: "cloud-concepts", label: "Cloud concepts" },
  { id: "architecture-services", label: "Azure architecture and services" },
  { id: "management-governance", label: "Azure management and governance" },
];

export type QuestionOption = { id: string; text: string };

export type Question = {
  id: string;
  kind: "diagnostic" | "follow-up";
  domain: Domain;
  concept: string;
  scenario: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string;
  conceptSummary: string;
  explanationsForWrongOptions: Record<string, string>;
  misconceptionTags: string[];
  sourceUrl: string;
  sourceTitle: string;
  reviewStatus: "reviewed";
  pairedQuestionId?: string;
};

const L = "https://learn.microsoft.com/en-us/training/modules/";
const SRC = {
  cloudCompute: [L + "describe-cloud-compute/", "Describe cloud computing"],
  benefits: [L + "describe-benefits-use-cloud-services/", "Describe the benefits of using cloud services"],
  serviceTypes: [L + "describe-cloud-service-types/", "Describe cloud service types"],
  architecture: [L + "describe-core-architectural-components-of-azure/", "Describe the core architectural components of Azure"],
  storage: [L + "describe-azure-storage-services/", "Describe Azure storage services"],
  identity: [L + "describe-azure-identity-access-security/", "Describe Azure identity, access, and security"],
  cost: [L + "describe-cost-management-azure/", "Describe cost management in Azure"],
  governance: [L + "describe-features-tools-azure-for-governance-compliance/", "Describe features and tools in Azure for governance and compliance"],
  monitoring: [L + "describe-monitoring-tools-azure/", "Describe monitoring tools in Azure"],
} as const;

const src = (k: keyof typeof SRC) => ({ sourceUrl: SRC[k][0], sourceTitle: SRC[k][1] });
const R = "reviewed" as const;

export const QUESTIONS: Question[] = [
  // ---------- Cloud concepts ----------
  {
    id: "cc-scal-1", kind: "diagnostic", domain: "cloud-concepts", concept: "Scalability vs. availability",
    scenario: "A small online bakery sees orders jump tenfold every December. The owner wants the site to add more server capacity during the rush and remove it in January. Which cloud benefit is this?",
    options: [
      { id: "a", text: "High availability" },
      { id: "b", text: "Scalability" },
      { id: "c", text: "Disaster recovery" },
      { id: "d", text: "Predictability of performance" },
    ],
    correctOptionId: "b",
    explanation: "Adding and removing resources in response to changing demand is scalability. The bakery's need is about capacity matching load, not about staying up during failures.",
    conceptSummary: "Scalability means adjusting resources to meet demand. Availability means the service stays accessible despite failures. A system can be highly scalable but still go down, or highly available but unable to absorb a spike.",
    explanationsForWrongOptions: {
      a: "High availability is about keeping the site running when components fail. The scenario is about handling more load, not surviving outages.",
      c: "Disaster recovery restores service after a major incident. No incident is described here.",
      d: "Predictability concerns consistent performance and cost, but the core action described—adding and removing capacity—is scalability.",
    },
    misconceptionTags: ["scalability-vs-availability"],
    ...src("benefits"), reviewStatus: R, pairedQuestionId: "cc-scal-f",
  },
  {
    id: "cc-scal-f", kind: "follow-up", domain: "cloud-concepts", concept: "Scalability vs. availability",
    scenario: "A school's grading portal runs on two copies in separate locations so that if one fails, students can still submit work. Traffic is steady all year. Which benefit does this design mainly provide?",
    options: [
      { id: "a", text: "Elasticity" },
      { id: "b", text: "Vertical scaling" },
      { id: "c", text: "High availability" },
      { id: "d", text: "Consumption-based pricing" },
    ],
    correctOptionId: "c",
    explanation: "Running redundant copies so the service stays reachable when one fails is high availability. Traffic is steady, so capacity changes are not the goal.",
    conceptSummary: "Redundancy to survive failure → availability. Adding or removing capacity for demand → scalability/elasticity.",
    explanationsForWrongOptions: {
      a: "Elasticity automatically adjusts capacity to demand. Demand here is steady.",
      b: "Vertical scaling makes one machine bigger. The design adds a redundant copy for failure protection.",
      d: "Consumption-based pricing is a billing model, not a resilience design.",
    },
    misconceptionTags: ["scalability-vs-availability"],
    ...src("benefits"), reviewStatus: R,
  },
  {
    id: "cc-svc-1", kind: "diagnostic", domain: "cloud-concepts", concept: "IaaS vs. PaaS vs. SaaS",
    scenario: "A developer wants to deploy a web app without managing the operating system, patches, or web server software, but still write and upload their own code. Which service type fits best?",
    options: [
      { id: "a", text: "Infrastructure as a service (IaaS)" },
      { id: "b", text: "Platform as a service (PaaS)" },
      { id: "c", text: "Software as a service (SaaS)" },
      { id: "d", text: "On-premises hosting" },
    ],
    correctOptionId: "b",
    explanation: "PaaS provides a managed platform (OS, runtime, patching) while you bring and manage your own application code.",
    conceptSummary: "IaaS: you manage the OS and up. PaaS: you manage your app and data; the platform is managed. SaaS: you just use finished software.",
    explanationsForWrongOptions: {
      a: "With IaaS you still manage the operating system and patches—exactly what the developer wants to avoid.",
      c: "SaaS is finished software you use; you don't upload your own application code.",
      d: "On-premises means managing everything yourself, including hardware.",
    },
    misconceptionTags: ["service-models"],
    ...src("serviceTypes"), reviewStatus: R, pairedQuestionId: "cc-svc-f",
  },
  {
    id: "cc-svc-f", kind: "follow-up", domain: "cloud-concepts", concept: "IaaS vs. PaaS vs. SaaS",
    scenario: "A retail company moves a legacy app to cloud virtual machines. It needs full control to install custom drivers and choose OS settings. Which service type is this?",
    options: [
      { id: "a", text: "SaaS" },
      { id: "b", text: "PaaS" },
      { id: "c", text: "IaaS" },
      { id: "d", text: "Serverless" },
    ],
    correctOptionId: "c",
    explanation: "Virtual machines with control over the OS and installed software are IaaS—the provider manages the physical infrastructure, you manage the rest.",
    conceptSummary: "The more control you keep over the OS, the closer you are to IaaS.",
    explanationsForWrongOptions: {
      a: "SaaS gives no control over the operating system at all.",
      b: "PaaS hides the OS, so you couldn't install custom drivers.",
      d: "Serverless abstracts servers entirely; there is no OS to configure.",
    },
    misconceptionTags: ["service-models"],
    ...src("serviceTypes"), reviewStatus: R,
  },
  {
    id: "cc-opex-1", kind: "diagnostic", domain: "cloud-concepts", concept: "CapEx vs. OpEx",
    scenario: "A startup chooses to pay monthly for cloud resources it actually uses instead of buying servers upfront. How is this spending typically classified?",
    options: [
      { id: "a", text: "Capital expenditure (CapEx)" },
      { id: "b", text: "Operational expenditure (OpEx)" },
      { id: "c", text: "Fixed asset depreciation" },
      { id: "d", text: "Reserved hardware spend" },
    ],
    correctOptionId: "b",
    explanation: "Paying as you go for services consumed is operational expenditure. There is no upfront purchase of physical assets.",
    conceptSummary: "CapEx is upfront spending on physical infrastructure. OpEx is ongoing spending on services. The cloud consumption model shifts spend toward OpEx.",
    explanationsForWrongOptions: {
      a: "CapEx is an upfront investment in physical assets, like buying servers—the opposite of what the startup chose.",
      c: "Depreciation applies to purchased assets; the startup isn't buying hardware.",
      d: "Nothing in the scenario reserves or buys hardware.",
    },
    misconceptionTags: ["capex-opex"],
    ...src("cloudCompute"), reviewStatus: R,
  },
  {
    id: "cc-shared-1", kind: "diagnostic", domain: "cloud-concepts", concept: "Shared responsibility model",
    scenario: "A school uses a SaaS email service. Under the shared responsibility model, which item always remains the school's responsibility?",
    options: [
      { id: "a", text: "Physical security of the datacenter" },
      { id: "b", text: "Patching the email server's operating system" },
      { id: "c", text: "The data and accounts the school manages" },
      { id: "d", text: "Network hardware in the datacenter" },
    ],
    correctOptionId: "c",
    explanation: "Regardless of service type, the customer stays responsible for its information and data, the devices that access it, and the accounts and identities it manages.",
    conceptSummary: "The provider always handles the physical datacenter. The customer always owns its data, devices, and identities. Everything in between shifts by service type.",
    explanationsForWrongOptions: {
      a: "Physical datacenter security is always the cloud provider's responsibility.",
      b: "In SaaS, the provider manages the operating system and patches.",
      d: "Datacenter network hardware belongs to the provider.",
    },
    misconceptionTags: ["shared-responsibility"],
    ...src("cloudCompute"), reviewStatus: R,
  },

  // ---------- Azure architecture and services ----------
  {
    id: "as-az-1", kind: "diagnostic", domain: "architecture-services", concept: "Regions and availability zones",
    scenario: "An online store wants its app to survive the failure of a single datacenter while staying within one Azure region. What should it use?",
    options: [
      { id: "a", text: "Availability zones" },
      { id: "b", text: "Resource groups" },
      { id: "c", text: "Management groups" },
      { id: "d", text: "A second subscription" },
    ],
    correctOptionId: "a",
    explanation: "Availability zones are physically separate datacenters within a region. Spreading resources across zones protects against a single datacenter failure.",
    conceptSummary: "Region: a geographic area with one or more datacenters. Availability zone: separate datacenters within a region. Region pairs: protection across regions.",
    explanationsForWrongOptions: {
      b: "Resource groups organize resources logically; they don't control physical placement.",
      c: "Management groups organize subscriptions for governance, not resilience.",
      d: "A subscription is a billing and access boundary, not a physical location.",
    },
    misconceptionTags: ["logical-vs-physical-grouping"],
    ...src("architecture"), reviewStatus: R, pairedQuestionId: "as-az-f",
  },
  {
    id: "as-az-f", kind: "follow-up", domain: "architecture-services", concept: "Regions and availability zones",
    scenario: "A company is planning for a regional outage and is configuring an Azure service that supports geo-replication. Which Azure concept identifies an associated secondary region for some services?",
    options: [
      { id: "a", text: "Availability zones only" },
      { id: "b", text: "Region pairs" },
      { id: "c", text: "Resource tags" },
      { id: "d", text: "Azure Policy" },
    ],
    correctOptionId: "b",
    explanation: "Some Azure services use region pairs to support geo-replication. Pairing alone does not replicate a workload or provide automatic recovery; the service and recovery plan must be configured.",
    conceptSummary: "Availability zones separate datacenters within a region. Region pairs associate some regions for services that support geo-replication; the pair alone does not provide automatic failover.",
    explanationsForWrongOptions: {
      a: "Availability zones are all inside one region, so a full-region outage would affect them.",
      c: "Tags are metadata labels; they provide no resilience.",
      d: "Azure Policy enforces rules; it doesn't replicate data.",
    },
    misconceptionTags: ["logical-vs-physical-grouping"],
    ...src("architecture"), reviewStatus: R,
  },
  {
    id: "as-auth-1", kind: "diagnostic", domain: "architecture-services", concept: "Authentication vs. authorization",
    scenario: "A teacher signs in to the school's Azure portal with a password and a phone code. Which process does this step represent?",
    options: [
      { id: "a", text: "Authorization" },
      { id: "b", text: "Authentication" },
      { id: "c", text: "Auditing" },
      { id: "d", text: "Encryption" },
    ],
    correctOptionId: "b",
    explanation: "Proving who you are—with a password plus a second factor—is authentication (here, multifactor authentication).",
    conceptSummary: "Authentication answers \"Who are you?\" Authorization answers \"What are you allowed to do?\" Authentication comes first.",
    explanationsForWrongOptions: {
      a: "Authorization decides what an already-identified user may access. Signing in is about proving identity.",
      c: "Auditing records activity after the fact.",
      d: "Encryption protects data; it doesn't verify the user.",
    },
    misconceptionTags: ["authn-vs-authz"],
    ...src("identity"), reviewStatus: R, pairedQuestionId: "as-auth-f",
  },
  {
    id: "as-auth-f", kind: "follow-up", domain: "architecture-services", concept: "Authentication vs. authorization",
    scenario: "After signing in, a store employee can view orders but cannot delete them. Which process determines this?",
    options: [
      { id: "a", text: "Authentication" },
      { id: "b", text: "Single sign-on" },
      { id: "c", text: "Authorization" },
      { id: "d", text: "Multifactor authentication" },
    ],
    correctOptionId: "c",
    explanation: "Deciding which actions a signed-in user can perform is authorization.",
    conceptSummary: "Identity proven → authentication. Permissions granted → authorization.",
    explanationsForWrongOptions: {
      a: "Authentication already happened at sign-in; it doesn't set what actions are allowed.",
      b: "Single sign-on lets one sign-in cover many apps; it's still about identity.",
      d: "MFA strengthens identity verification, not permissions.",
    },
    misconceptionTags: ["authn-vs-authz"],
    ...src("identity"), reviewStatus: R,
  },
  {
    id: "as-stor-1", kind: "diagnostic", domain: "architecture-services", concept: "Blob storage access tiers",
    scenario: "A clinic must keep old scanned records for years. They're almost never read, and waiting hours to retrieve one is acceptable. Which blob access tier has the lowest storage cost for this access pattern? Consider retrieval and transaction costs separately from storage price.",
    options: [
      { id: "a", text: "Hot" },
      { id: "b", text: "Cool" },
      { id: "c", text: "Cold" },
      { id: "d", text: "Archive" },
      { id: "e", text: "Premium" },
    ],
    correctOptionId: "d",
    explanation: "Archive has the lowest storage cost and suits rarely accessed data that can tolerate retrieval latency of hours. Retrieval, rehydration, and transaction charges can affect total cost.",
    conceptSummary: "Hot: frequent access. Cool: infrequent access. Cold: rarely accessed but online for fast retrieval. Archive: rarely accessed, offline, lowest storage cost, and retrieval can take hours.",
    explanationsForWrongOptions: {
      a: "Hot is optimized for frequently accessed data and costs the most to store.",
      b: "Cool is cheaper than hot but still more expensive to store than archive; it suits data read occasionally.",
      c: "Cold is for rarely accessed data that still needs fast online retrieval; this clinic can tolerate hours.",
      e: "Premium is for low-latency performance, the opposite of this need.",
    },
    misconceptionTags: ["storage-tiers"],
    ...src("storage"), reviewStatus: R,
  },
  {
    id: "as-rg-1", kind: "diagnostic", domain: "architecture-services", concept: "Resource hierarchy",
    scenario: "A small business wants to delete every resource for a finished marketing campaign in one action. How should the resources have been organized?",
    options: [
      { id: "a", text: "In the same availability zone" },
      { id: "b", text: "In a dedicated resource group" },
      { id: "c", text: "Under the same Microsoft Entra ID tenant" },
      { id: "d", text: "In the same region" },
    ],
    correctOptionId: "b",
    explanation: "Resources in a resource group share a lifecycle. Deleting the group deletes everything in it.",
    conceptSummary: "Hierarchy: management groups → subscriptions → resource groups → resources. Resource groups are a logical container for resources that share a lifecycle.",
    explanationsForWrongOptions: {
      a: "Availability zones are physical locations; you can't delete a zone's contents as a unit.",
      c: "A tenant holds identities for the whole organization, far more than one campaign.",
      d: "A region holds many unrelated resources and isn't a delete boundary.",
    },
    misconceptionTags: ["logical-vs-physical-grouping"],
    ...src("architecture"), reviewStatus: R,
  },

  // ---------- Azure management and governance ----------
  {
    id: "mg-pol-1", kind: "diagnostic", domain: "management-governance", concept: "Azure Policy vs. Azure RBAC",
    scenario: "An IT lead wants ordinary deployments, including deployments by resource owners, to be denied outside the West Europe region. An allowed-locations deny policy is assigned at the relevant scope with no exemption. Which service provides this enforcement?",
    options: [
      { id: "a", text: "Azure role-based access control (RBAC)" },
      { id: "b", text: "Azure Policy" },
      { id: "c", text: "Resource tags" },
      { id: "d", text: "Azure Advisor" },
    ],
    correctOptionId: "b",
    explanation: "While an allowed-locations deny policy remains assigned at the relevant scope and has no exemption, Azure Policy denies ordinary deployments outside West Europe regardless of the resource owner's role.",
    conceptSummary: "RBAC controls who can do what. Azure Policy controls what resources are allowed to look like. They work together.",
    explanationsForWrongOptions: {
      a: "RBAC controls who can perform actions, not which property values (like region) resources may have. An admin with rights could still pick any region.",
      c: "Tags label resources; they don't block deployments.",
      d: "Advisor makes recommendations; it doesn't enforce rules.",
    },
    misconceptionTags: ["policy-vs-rbac"],
    ...src("governance"), reviewStatus: R, pairedQuestionId: "mg-pol-f",
  },
  {
    id: "mg-pol-f", kind: "follow-up", domain: "management-governance", concept: "Azure Policy vs. Azure RBAC",
    scenario: "A school wants a teaching assistant to restart virtual machines but not delete them. What should be assigned at the narrowest suitable scope?",
    options: [
      { id: "a", text: "Azure Policy" },
      { id: "b", text: "A custom Azure RBAC role assignment" },
      { id: "c", text: "Resource lock" },
      { id: "d", text: "Microsoft Purview" },
    ],
    correctOptionId: "b",
    explanation: "Assign a custom Azure RBAC role at the narrowest suitable scope. Include the required VM restart permissions and omit delete permissions.",
    conceptSummary: "\"Who can do which action?\" → RBAC. \"Which configurations are allowed?\" → Policy.",
    explanationsForWrongOptions: {
      a: "Policy governs resource properties, not which user can perform which action.",
      c: "A lock would block deletion for everyone, not just this person, and doesn't grant restart rights.",
      d: "Purview is for data governance, not access to virtual machines.",
    },
    misconceptionTags: ["policy-vs-rbac"],
    ...src("identity"), reviewStatus: R,
  },
  {
    id: "mg-lock-1", kind: "diagnostic", domain: "management-governance", concept: "Resource locks",
    scenario: "A company wants to protect its production database against accidental deletion while still allowing authorized users to change its settings. What should be applied?",
    options: [
      { id: "a", text: "A ReadOnly lock" },
      { id: "b", text: "A CanNotDelete (Delete) lock" },
      { id: "c", text: "A Reader role assignment" },
      { id: "d", text: "A cost budget" },
    ],
    correctOptionId: "b",
    explanation: "A CanNotDelete lock blocks deletion while it exists, while allowing authorized users to read and modify the resource. An authorized user with lock-management permission, such as an Owner, can remove the lock.",
    conceptSummary: "Locks apply across roles while they exist. Delete lock: blocks deletion but allows changes. ReadOnly lock: blocks control-plane updates and deletion. Authorized users with lock-management permission can remove a lock.",
    explanationsForWrongOptions: {
      a: "ReadOnly would also block setting changes, which the company still needs.",
      c: "Changing roles affects specific users; an owner could still delete the database.",
      d: "Budgets track spending; they don't protect resources.",
    },
    misconceptionTags: ["locks-vs-rbac"],
    ...src("governance"), reviewStatus: R, pairedQuestionId: "mg-lock-f",
  },
  {
    id: "mg-lock-f", kind: "follow-up", domain: "management-governance", concept: "Resource locks",
    scenario: "An administrator applied a ReadOnly lock to a storage account. A user with the Owner role tries to change an ARM-managed setting that the lock blocks. What happens?",
    options: [
      { id: "a", text: "The change succeeds because Owners bypass locks" },
      { id: "b", text: "The change is blocked until the lock is removed" },
      { id: "c", text: "The change succeeds but is logged as a warning" },
      { id: "d", text: "The storage account is automatically deleted" },
    ],
    correctOptionId: "b",
    explanation: "The ReadOnly lock blocks that Azure control-plane operation regardless of the user's role. Even an Owner must remove the lock before making the blocked change.",
    conceptSummary: "Locks override permissions; removing a lock is a deliberate extra step.",
    explanationsForWrongOptions: {
      a: "Owners don't bypass a lock for a blocked control-plane operation; they'd need to remove the lock first.",
      c: "Locks block the action—they don't just warn.",
      d: "Locks never delete resources.",
    },
    misconceptionTags: ["locks-vs-rbac"],
    ...src("governance"), reviewStatus: R,
  },
  {
    id: "mg-cost-1", kind: "diagnostic", domain: "management-governance", concept: "Pricing calculator vs. TCO calculator",
    scenario: "A school wants to estimate the monthly cost of two new virtual machines and some storage before deploying them. Which tool fits best?",
    options: [
      { id: "a", text: "Azure pricing calculator" },
      { id: "b", text: "Total cost of ownership (TCO) calculator" },
      { id: "c", text: "Azure Service Health" },
      { id: "d", text: "Azure Monitor" },
    ],
    correctOptionId: "a",
    explanation: "The pricing calculator estimates the cost of specific Azure services you plan to provision.",
    conceptSummary: "Pricing calculator: estimate Azure services. TCO calculator: compare on-premises costs with Azure.",
    explanationsForWrongOptions: {
      b: "The TCO calculator compares your on-premises infrastructure cost with Azure; there's no on-premises comparison here.",
      c: "Service Health reports Azure incidents and maintenance, not prices.",
      d: "Azure Monitor collects telemetry from running resources.",
    },
    misconceptionTags: ["cost-tools"],
    ...src("cost"), reviewStatus: R,
  },
  {
    id: "mg-mon-1", kind: "diagnostic", domain: "management-governance", concept: "Azure Advisor vs. Service Health",
    scenario: "A store owner wants personalized recommendations to reduce costs and improve the security of their existing Azure resources. Which service provides this?",
    options: [
      { id: "a", text: "Azure Service Health" },
      { id: "b", text: "Azure Advisor" },
      { id: "c", text: "Azure Policy" },
      { id: "d", text: "Azure Arc" },
    ],
    correctOptionId: "b",
    explanation: "Azure Advisor analyzes your deployed resources and recommends improvements across cost, security, reliability, performance, and operational excellence.",
    conceptSummary: "Advisor: recommendations for your resources. Service Health: status of Azure services affecting you. Monitor: telemetry and alerts.",
    explanationsForWrongOptions: {
      a: "Service Health tells you about Azure outages and maintenance, not optimization tips.",
      c: "Policy enforces rules you define; it doesn't generate recommendations.",
      d: "Azure Arc extends Azure management to resources outside Azure.",
    },
    misconceptionTags: ["monitoring-tools"],
    ...src("monitoring"), reviewStatus: R,
  },
];

export const QUESTION_MAP: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
export const STUDY_GUIDE_URL = "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900";
export const domainLabel = (d: Domain) => DOMAINS.find((x) => x.id === d)?.label ?? d;
