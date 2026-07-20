# AI Platform FY27 detailed delivery plan

Planning horizon: **3 August 2026 to 30 June 2027**  
Source inputs: AI Platform team structure, FY27 high-level themes, and the Q1FY27 / Release 4 feature plan supplied on 20 July 2026.

## Planning assumptions

- Release 4 runs from 3 August to 30 September 2026; Release 5 from 1 October to 18 December 2026; Release 6 from 4 January to 31 March 2027; and Release 7 from 1 April to 30 June 2027.
- The named owner in each task label is the accountable lead. Where two names appear, the first is the lead and the second is the principal contributor.
- Work is distributed across all 20 listed team members. Dates are a capacity-informed first pass, not a commitment of full-time allocation.
- Release 4 covers the supplied feature list except **Robotics Control Plane**, which is explicitly excluded. Physical AI work begins in Release 7 with discovery, safety, edge, sensor, and use-case foundations rather than a robot control panel.
- The Release 4 slide shows a 500/500 capacity indicator, but its visible estimates total 510 points after excluding the 30-point Robotics Control Plane and the unestimated User and Usage Analytics acceleration item. This 10-point discrepancy needs backlog reconciliation. Reporting discovery is included, while delivery continues as an ongoing foundation.
- Weekends are excluded by Mermaid. Public holidays, individual leave, procurement lead times, and external vendor commitments are not yet modelled.

## Mermaid Gantt chart

```mermaid
gantt
    title AI Platform FY27 detailed delivery plan | 03 Aug 2026 - 30 Jun 2027
    dateFormat YYYY-MM-DD
    axisFormat %d %b %Y
    excludes weekends
    todayMarker off

    section Portfolio gates
    FY27 delivery mobilisation complete                         :milestone, gate000, 2026-08-03, 0d
    Release 4 scope and architecture baseline                  :crit, gate001, 2026-08-03, 2026-08-14
    Release 4 build complete                                   :milestone, gate002, 2026-09-18, 0d
    Release 4 production readiness review                      :crit, gate003, 2026-09-21, 2026-09-25
    Release 4 go-live                                          :milestone, gate004, 2026-09-30, 0d
    Release 5 scope and outcome baseline                       :crit, gate005, 2026-10-01, 2026-10-09
    Release 5 agent platform integration test                  :crit, gate006, 2026-12-01, 2026-12-11
    Release 5 go-live                                          :milestone, gate007, 2026-12-18, 0d
    Release 6 scope and optimisation baselines                 :crit, gate008, 2027-01-04, 2027-01-15
    Release 6 resilience and governance test                   :crit, gate009, 2027-03-08, 2027-03-19
    Release 6 go-live                                          :milestone, gate010, 2027-03-31, 0d
    Release 7 physical AI scope and safety baseline            :crit, gate011, 2027-04-01, 2027-04-16
    Release 7 field validation                                 :crit, gate012, 2027-06-01, 2027-06-18
    Release 7 go-live and FY27 close                           :milestone, gate013, 2027-06-30, 0d

    section Leadership Strategy and Planning | Tom Martin Magesan David
    R4 mobilisation and delivery cadence - Tom                 :lead001, 2026-08-03, 2026-08-07
    R4 scope sequencing and dependency map - Martin            :lead002, 2026-08-03, 2026-08-14
    R4 architecture and technical decision forum - Magesan     :lead003, 2026-08-03, 2026-09-25
    R4 benefits baseline and point tracking - David            :lead004, 2026-08-03, 2026-08-21
    R4 fortnightly delivery assurance - Tom                    :lead005, 2026-08-10, 2026-09-25
    R4 vendor and enterprise dependency resolution - Martin    :lead006, 2026-08-17, 2026-09-18
    R4 production readiness approval - Magesan and David       :crit, lead007, 2026-09-21, 2026-09-29
    R4 release retrospective and benefits checkpoint - David   :lead008, 2026-09-28, 2026-10-09
    R5 agent vision and investment guardrails - Tom            :lead009, 2026-09-14, 2026-10-09
    R5 portfolio backlog and quarterly plan - Martin           :lead010, 2026-09-21, 2026-10-16
    R5 reference architecture governance - Magesan             :lead011, 2026-10-01, 2026-12-11
    R5 outcome tracking and steering reports - David           :lead012, 2026-10-12, 2026-12-18
    R5 cross-domain delivery assurance - Tom and Martin        :lead013, 2026-10-12, 2026-12-18
    R6 optimisation strategy and targets - Tom                 :lead014, 2026-12-07, 2027-01-15
    R6 capacity and investment plan - Martin                   :lead015, 2026-12-07, 2027-01-22
    R6 resilience architecture oversight - Magesan             :lead016, 2027-01-04, 2027-03-26
    R6 value cost and sustainability scorecard - David         :lead017, 2027-01-11, 2027-03-31
    R6 continuous improvement governance - Tom and Martin      :lead018, 2027-02-01, 2027-03-31
    R7 physical AI strategy and use-case guardrails - Tom       :lead019, 2027-03-01, 2027-04-16
    R7 partner roadmap and field delivery plan - Martin         :lead020, 2027-03-15, 2027-04-23
    R7 edge and physical AI reference architecture - Magesan    :lead021, 2027-04-01, 2027-06-25
    R7 portfolio value evidence and FY28 recommendations - David:lead022, 2027-04-12, 2027-06-30
    FY28 roadmap and investment submission - Tom and Martin     :crit, lead023, 2027-05-17, 2027-06-25

    section User Adoption | Jen Josh
    R4 stakeholder and audience mapping - Jen                  :adopt001, 2026-08-03, 2026-08-14
    R4 developer onboarding journey - Josh                     :adopt002, 2026-08-10, 2026-08-28
    R4 harness and platform learning content - Josh            :adopt003, 2026-08-17, 2026-09-11
    R4 pilot communications and office hours - Jen             :adopt004, 2026-08-24, 2026-09-30
    R4 adoption readiness and launch campaign - Jen and Josh   :crit, adopt005, 2026-09-14, 2026-10-09
    R4 user usage baseline and feedback loop - Josh            :adopt006, 2026-09-21, 2026-10-23
    R5 agent literacy curriculum - Josh                        :adopt007, 2026-10-01, 2026-11-06
    R5 agent champions network - Jen                           :adopt008, 2026-10-05, 2026-12-18
    R5 responsible agent behaviour campaign - Jen             :adopt009, 2026-11-02, 2026-12-11
    R5 role-based workshops and adoption measurement - Josh    :adopt010, 2026-11-09, 2026-12-18
    R6 optimisation playbook and practitioner clinics - Josh   :adopt011, 2027-01-11, 2027-02-26
    R6 cost-aware usage campaign - Jen                         :adopt012, 2027-01-18, 2027-03-12
    R6 adoption health review and interventions - Jen and Josh :adopt013, 2027-02-15, 2027-03-31
    R7 physical AI audience and change impact assessment - Jen :adopt014, 2027-04-01, 2027-04-30
    R7 operator and maintainer learning design - Josh          :adopt015, 2027-04-19, 2027-05-28
    R7 field pilot communications and training - Jen and Josh  :crit, adopt016, 2027-05-17, 2027-06-25
    FY27 adoption outcomes and FY28 backlog - Jen              :adopt017, 2027-06-14, 2027-06-30

    section Business Partnering | James Gaurav Matt Vishal Kamila
    R4 domain demand validation and prioritisation - James     :bp001, 2026-08-03, 2026-08-14
    R4 harness pilot recruitment - Gaurav                      :bp002, 2026-08-10, 2026-08-28
    R4 controls agent process discovery - Matt                 :bp003, 2026-08-03, 2026-08-21
    R4 unified access use cases and approvals - Vishal         :bp004, 2026-08-10, 2026-09-04
    R4 A2A domain scenarios and success measures - Kamila      :bp005, 2026-08-17, 2026-09-11
    R4 pilot feedback and acceptance coordination - Gaurav     :bp006, 2026-09-07, 2026-09-25
    R4 value stories and release acceptance - James and Matt   :crit, bp007, 2026-09-14, 2026-09-30
    R5 agent opportunity portfolio - James                     :bp008, 2026-10-01, 2026-10-23
    R5 enterprise integration requirements - Vishal            :bp009, 2026-10-05, 2026-11-06
    R5 human-in-the-loop workflow pilots - Matt                :bp010, 2026-10-19, 2026-12-11
    R5 agent studio co-design cohort - Gaurav                  :bp011, 2026-10-19, 2026-12-04
    R5 multi-agent domain pilot coordination - Kamila          :bp012, 2026-11-02, 2026-12-18
    R5 business acceptance and outcomes review - James         :bp013, 2026-12-07, 2026-12-18
    R6 service optimisation opportunities - Gaurav             :bp014, 2027-01-04, 2027-01-29
    R6 cost allocation and value model with domains - James    :bp015, 2027-01-11, 2027-02-12
    R6 data quality remediation sponsorship - Vishal           :bp016, 2027-01-18, 2027-03-12
    R6 resilience exercise business scenarios - Matt          :bp017, 2027-02-01, 2027-03-19
    R6 continuous improvement backlog with domains - Kamila    :bp018, 2027-02-15, 2027-03-31
    R7 physical AI use-case discovery - James and Kamila       :bp019, 2027-04-01, 2027-04-30
    R7 site workflow and operator requirements - Gaurav        :bp020, 2027-04-12, 2027-05-14
    R7 safety case stakeholder coordination - Matt             :bp021, 2027-04-19, 2027-06-11
    R7 sensor and enterprise integration requirements - Vishal :bp022, 2027-04-26, 2027-05-28
    R7 field pilot acceptance and value assessment - Kamila    :crit, bp023, 2027-06-01, 2027-06-25
    FY28 domain pipeline and prioritisation - James            :bp024, 2027-06-07, 2027-06-30

    section Governance and Compliance | Tristan Edwin
    R4 control obligations and evidence map - Tristan          :gov001, 2026-08-03, 2026-08-21
    R4 automated compliance test design - Edwin                :gov002, 2026-08-10, 2026-09-04
    R4 controls agent policy corpus review - Tristan           :gov003, 2026-08-17, 2026-09-11
    R4 JFrog security control acceptance - Edwin               :gov004, 2026-08-24, 2026-09-18
    R4 access model risk assessment - Tristan                  :gov005, 2026-08-24, 2026-09-18
    R4 release evidence pack and sign-off - Tristan and Edwin  :crit, gov006, 2026-09-14, 2026-09-29
    R5 agent policy and standards uplift - Tristan             :crit, gov007, 2026-10-01, 2026-11-13
    R5 secure agent access control patterns - Edwin            :gov008, 2026-10-12, 2026-11-27
    R5 agent evaluation and monitoring controls - Edwin        :gov009, 2026-11-02, 2026-12-11
    R5 human oversight and exception process - Tristan         :gov010, 2026-11-09, 2026-12-18
    R6 governance control effectiveness review - Tristan       :gov011, 2027-01-04, 2027-02-05
    R6 automated remediation control rollout - Edwin           :gov012, 2027-01-18, 2027-03-12
    R6 resilience threat modelling and assurance - Tristan     :gov013, 2027-02-01, 2027-03-19
    R6 model governance audit evidence - Edwin                 :gov014, 2027-02-15, 2027-03-26
    R7 physical AI safety and compliance framework - Tristan   :crit, gov015, 2027-04-01, 2027-05-14
    R7 edge device identity and security controls - Edwin      :gov016, 2027-04-19, 2027-05-28
    R7 field trial assurance and incident plan - Tristan       :gov017, 2027-05-17, 2027-06-18
    R7 compliance evidence and release sign-off - Edwin        :crit, gov018, 2027-06-07, 2027-06-29

    section AI Connectivity | Mak Sarah
    R4 unified access technical design - Mak                   :conn001, 2026-08-03, 2026-08-21
    R4 identity role and group integration - Sarah             :conn002, 2026-08-17, 2026-09-11
    R4 enterprise system access broker MVP - Mak               :crit, conn003, 2026-08-24, 2026-09-18
    R4 access integration and negative testing - Sarah         :conn004, 2026-09-07, 2026-09-25
    R4 connectivity production runbook - Mak and Sarah         :conn005, 2026-09-14, 2026-09-30
    R5 O365 MCP read access design - Sarah                     :conn006, 2026-10-01, 2026-10-23
    R5 O365 MCP write access and consent controls - Mak        :crit, conn007, 2026-10-19, 2026-11-20
    R5 enterprise connector catalogue and SDK - Sarah          :conn008, 2026-10-26, 2026-12-04
    R5 agent connector integration tests - Mak                 :conn009, 2026-11-16, 2026-12-11
    R5 connector production onboarding - Mak and Sarah        :conn010, 2026-12-01, 2026-12-18
    R6 connector performance and reliability baseline - Sarah :conn011, 2027-01-04, 2027-01-29
    R6 connection pooling caching and throttling - Mak         :conn012, 2027-01-25, 2027-02-26
    R6 failover and disaster recovery tests - Sarah            :crit, conn013, 2027-02-22, 2027-03-19
    R6 connectivity SLO rollout - Mak and Sarah                :conn014, 2027-03-08, 2027-03-31
    R7 edge gateway connectivity pattern - Mak                 :conn015, 2027-04-01, 2027-05-07
    R7 intermittent network and store-forward design - Sarah   :conn016, 2027-04-19, 2027-05-28
    R7 edge-to-platform secure integration pilot - Mak         :crit, conn017, 2027-05-17, 2027-06-18
    R7 field connectivity validation and handover - Sarah      :conn018, 2027-06-07, 2027-06-30

    section OpenAI Enablement | Joseph
    R4 OpenAI feature intake and safety assessment - Joseph    :oai001, 2026-08-03, 2026-08-28
    R4 priority feature sandbox validation - Joseph            :oai002, 2026-08-17, 2026-09-11
    R4 approved feature enablement and guidance - Joseph       :crit, oai003, 2026-09-07, 2026-09-25
    R4 usage and issue review - Joseph                         :oai004, 2026-09-21, 2026-10-09
    R5 agent capability and model evaluation - Joseph          :oai005, 2026-10-01, 2026-10-30
    R5 skills and prompt template standards - Joseph           :oai006, 2026-10-19, 2026-11-20
    R5 agent orchestration enablement guidance - Joseph        :oai007, 2026-11-09, 2026-12-11
    R5 OpenAI capability release and office hours - Joseph     :oai008, 2026-12-01, 2026-12-18
    R6 model routing quality and cost experiments - Joseph     :oai009, 2027-01-04, 2027-02-12
    R6 prompt and evaluation optimisation pack - Joseph        :oai010, 2027-02-01, 2027-03-12
    R6 OpenAI capability lifecycle review - Joseph             :oai011, 2027-03-01, 2027-03-31
    R7 multimodal and edge capability assessment - Joseph      :oai012, 2027-04-01, 2027-04-30
    R7 physical AI model evaluation support - Joseph           :oai013, 2027-05-03, 2027-06-11
    R7 capability recommendations and FY28 backlog - Joseph    :oai014, 2027-06-07, 2027-06-30

    section Build Enablement | Dar Shub
    R4 agentic engineering harness architecture - Dar          :build001, 2026-08-03, 2026-08-14
    R4 harness build workflow and golden path - Shub           :crit, build002, 2026-08-10, 2026-09-04
    R4 JFrog security scanning pipeline - Dar                  :crit, build003, 2026-08-03, 2026-09-04
    R4 architecture patterns for agents - Dar                  :build004, 2026-08-17, 2026-09-11
    R4 automated test and release templates - Shub             :build005, 2026-08-24, 2026-09-18
    R4 harness pilot remediation and docs - Shub               :build006, 2026-09-07, 2026-09-25
    R4 production onboarding and support handover - Dar        :build007, 2026-09-21, 2026-09-30
    R5 agent framework and orchestration core - Dar            :crit, build008, 2026-10-01, 2026-11-13
    R5 agent studio developer experience - Shub                :build009, 2026-10-12, 2026-11-27
    R5 single agent skills repository - Dar                    :build010, 2026-10-19, 2026-11-20
    R5 cloud agent workspace templates - Shub                  :build011, 2026-10-26, 2026-12-04
    R5 A2A reference implementation - Dar                      :build012, 2026-11-09, 2026-12-11
    R5 integrated agent platform release - Dar and Shub        :crit, build013, 2026-12-01, 2026-12-18
    R6 CI pipeline performance optimisation - Shub             :build014, 2027-01-04, 2027-02-05
    R6 deployment simplification and self-service - Dar        :build015, 2027-01-18, 2027-02-26
    R6 automated remediation workflows - Shub                  :build016, 2027-02-01, 2027-03-12
    R6 platform resilience tests and runbooks - Dar            :crit, build017, 2027-02-22, 2027-03-26
    R7 edge application build and packaging pattern - Dar      :build018, 2027-04-01, 2027-05-07
    R7 device deployment and rollback automation - Shub        :build019, 2027-04-19, 2027-05-28
    R7 physical AI pilot CI CD pipeline - Dar and Shub         :crit, build020, 2027-05-17, 2027-06-18
    R7 build assets hardening and handover - Shub              :build021, 2027-06-07, 2027-06-30

    section Data Management | Maria Ramya
    R4 open-source model hosting requirements - Maria          :data001, 2026-08-03, 2026-08-21
    R4 vendor and model option evaluation - Ramya              :data002, 2026-08-10, 2026-08-28
    R4 governed model registry and metadata design - Maria     :data003, 2026-08-24, 2026-09-11
    R4 hosting proof of value and risk evidence - Ramya        :crit, data004, 2026-09-07, 2026-09-25
    R4 data usage reporting requirements - Maria               :data005, 2026-09-14, 2026-10-09
    R5 agent knowledge and retrieval data patterns - Maria     :data006, 2026-10-01, 2026-11-06
    R5 skill metadata taxonomy and catalogue - Ramya           :data007, 2026-10-12, 2026-11-20
    R5 agent telemetry and evaluation data pipeline - Ramya    :data008, 2026-11-02, 2026-12-11
    R5 data access integration and quality tests - Maria       :crit, data009, 2026-11-16, 2026-12-18
    R6 data quality rules and scorecards - Maria               :data010, 2027-01-04, 2027-02-12
    R6 model lineage registry and governance - Ramya           :data011, 2027-01-18, 2027-03-05
    R6 cost usage and sustainability data mart - Maria         :data012, 2027-02-01, 2027-03-19
    R6 quality remediation and audit evidence - Ramya          :crit, data013, 2027-03-01, 2027-03-31
    R7 sensor data classification and contracts - Maria        :data014, 2027-04-01, 2027-05-07
    R7 streaming ingestion and time-series design - Ramya      :data015, 2027-04-19, 2027-05-28
    R7 sensor fusion quality and lineage controls - Maria      :data016, 2027-05-10, 2027-06-18
    R7 field data validation and operational handover - Ramya  :crit, data017, 2027-06-01, 2027-06-30

    section Cross-team foundations and operations
    Secure-by-design reviews - Tristan Magesan Edwin           :foundation001, 2026-08-03, 2027-06-30
    Platform architecture and standards forum - Magesan Dar    :foundation002, 2026-08-03, 2027-06-30
    Data and platform capability management - Maria Ramya      :foundation003, 2026-08-03, 2027-06-30
    Developer ecosystem community - Jen Josh Shub              :foundation004, 2026-08-10, 2027-06-30
    Change adoption and value reporting - Jen David James      :foundation005, 2026-08-03, 2027-06-30
    Service operations and critical system support - Martin    :crit, foundation006, 2026-08-03, 2026-09-04
    Support ownership model and service catalogue - Martin     :foundation007, 2026-08-10, 2026-09-11
    Gateway Databricks AIP and ChatGPT runbooks - Mak Sarah    :foundation008, 2026-08-17, 2026-09-18
    On-call readiness and incident simulation - Tom and Dar    :crit, foundation009, 2026-09-07, 2026-09-25
    Production monitoring and observability baseline - Shub    :foundation010, 2026-08-17, 2026-10-16
    User usage analytics instrumentation - Ramya and Josh      :foundation011, 2026-09-14, 2026-11-13
    Adoption performance and cost reporting MVP - David Maria  :foundation012, 2026-09-21, 2026-11-20
    Monthly service and value review - Tom David Jen           :foundation013, 2026-10-01, 2027-06-30
    Quarterly architecture risk and control review - Magesan   :foundation014, 2026-09-21, 2027-06-25
    Continuous backlog discovery and refinement - Martin James :foundation015, 2026-08-03, 2027-06-30
    FY27 benefits realisation closeout - David and Jen          :crit, foundation016, 2027-06-01, 2027-06-30
```

## Explicitly out of scope

- **Robotics Control Plane** is not scheduled in Release 4 and is not included elsewhere in this plan.
- Release 7 work establishes Physical AI foundations and a bounded field pilot only. Any future unified robot registration or control-plane product requires separate discovery, funding, architecture, safety approval, and roadmap authorisation.

## Next refinement inputs

The next planning pass should replace assumptions with confirmed release dates, feature priorities, delivery status, individual capacity/leave, business-domain assignments, external dependencies, and the intended scope boundary for Release 7 Physical AI.
