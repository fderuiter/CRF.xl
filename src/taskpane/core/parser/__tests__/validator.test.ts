import { validateStudyDesign } from '../validator';
import { StudyDesign, DataType, EventType } from '../../types';

describe('Clinical Validator Engine', () => {
    let mockStudy: StudyDesign;

    beforeEach(() => {
        // Generate a clean, mathematically perfect StudyDesign payload before each test
        mockStudy = {
            metadata: { protocolId: "TEST-01", studyName: "Unit Test Study", version: "1.0", defaultLanguage: "en-US" },
            events: [
                { 
                    eventOid: "V1", eventName: "Visit 1", orderNumber: 1, eventType: EventType.SCHEDULED, 
                    forms: [{ formOid: "F1", orderNumber: 1, mandatory: true }] 
                }
            ],
            forms: {
                "F1": { 
                    formOid: "F1", formName: "Form 1", orderNumber: 1, repeating: false, effectiveVersion: "1.0",
                    itemGroups: [
                        { 
                            groupOid: "G1", name: "Group 1", repeating: false, orderNumber: 1, 
                            items: [
                                { 
                                    itemOid: "I1", name: "Item 1", formOid: "F1", groupOid: "G1", orderNumber: 1, 
                                    dataType: DataType.TEXT, label: {"en-US": "Item 1"}, effectiveVersion: "1.0", 
                                    validation: { required: false } 
                                }
                            ]
                        }
                    ]
                }
            },
            codelists: {}
        };
    });

    it('should return 0 issues for a perfectly valid study', () => {
        const issues = validateStudyDesign(mockStudy);
        expect(issues.length).toBe(0);
    });

    it('should throw an Error if an Item references a missing Codelist ID', () => {
        // Mutate the valid study to inject an error
        mockStudy.forms["F1"].itemGroups[0].items[0].dataType = DataType.CODELIST;
        mockStudy.forms["F1"].itemGroups[0].items[0].codelistId = "MISSING_DICTIONARY";
        
        const issues = validateStudyDesign(mockStudy);
        
        const error = issues.find(i => i.level === 'Error' && i.message.includes('Missing Codelist definition'));
        expect(error).toBeDefined();
        expect(error?.location).toContain('Form 1 > Item 1');
    });

    it('should validate codelistId references even when dataType is not Codelist', () => {
        mockStudy.forms["F1"].itemGroups[0].items[0].dataType = DataType.TEXT;
        mockStudy.forms["F1"].itemGroups[0].items[0].codelistId = "MISSING_DICTIONARY";

        const issues = validateStudyDesign(mockStudy);

        const error = issues.find(i => i.level === 'Error' && i.message.includes('Missing Codelist definition'));
        expect(error).toBeDefined();
    });

    it('should throw an Error if an Event references a missing Form ID', () => {
        // Mutate the schedule to request a non-existent form
        mockStudy.events[0].forms[0].formOid = "NON_EXISTENT_FORM";
        
        const issues = validateStudyDesign(mockStudy);
        
        const error = issues.find(i => i.level === 'Error' && i.message.includes('non-existent Form ID'));
        expect(error).toBeDefined();
    });

    it('should throw an Error if an Item is missing a Variable Name', () => {
        (mockStudy.forms["F1"].itemGroups[0].items[0] as any).itemOid = "";
        (mockStudy.forms["F1"].itemGroups[0].items[0] as any).rowIndex = 7;

        const issues = validateStudyDesign(mockStudy);

        expect(issues).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    level: 'Error',
                    message: 'Missing Variable Name.',
                    location: 'F1 > Row 7',
                    rowIndex: 7,
                    sheetName: 'F1',
                }),
            ])
        );
    });

    it('should throw an Error if Type is Codelist and ID is blank', () => {
        mockStudy.forms["F1"].itemGroups[0].items[0].dataType = DataType.CODELIST;
        delete (mockStudy.forms["F1"].itemGroups[0].items[0] as any).codelistId;
        (mockStudy.forms["F1"].itemGroups[0].items[0] as any).rowIndex = 2;

        const issues = validateStudyDesign(mockStudy);

        expect(issues).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    level: 'Error',
                    message: 'Type is Codelist, but ID is blank.',
                    location: 'Form 1 > Item 1',
                    rowIndex: 2,
                    sheetName: 'F1',
                }),
            ])
        );
    });

    it('should not throw a Codelist reference error when the Codelist exists', () => {
        mockStudy.forms["F1"].itemGroups[0].items[0].dataType = DataType.CODELIST;
        mockStudy.forms["F1"].itemGroups[0].items[0].codelistId = "YESNO";
        mockStudy.codelists["YESNO"] = {
            codelistId: "YESNO",
            codelistName: "Yes / No",
            dataType: DataType.TEXT,
            items: [
                { codelistId: "YESNO", codedValue: "Y", decodedText: { "en-US": "Yes" }, orderNumber: 1 },
                { codelistId: "YESNO", codedValue: "N", decodedText: { "en-US": "No" }, orderNumber: 2 },
            ],
        };

        const issues = validateStudyDesign(mockStudy);
        const codelistErrors = issues.filter(i => i.message.includes('Codelist'));

        expect(codelistErrors).toHaveLength(0);
    });

    it('should throw an Error for duplicate Variable Names across forms', () => {
        mockStudy.forms["F2"] = {
            formOid: "F2",
            formName: "Form 2",
            orderNumber: 2,
            repeating: false,
            effectiveVersion: "1.0",
            itemGroups: [
                {
                    groupOid: "G2",
                    name: "Group 2",
                    repeating: false,
                    orderNumber: 1,
                    items: [
                        {
                            itemOid: "I1",
                            name: "Item 2",
                            formOid: "F2",
                            groupOid: "G2",
                            orderNumber: 1,
                            dataType: DataType.TEXT,
                            label: { "en-US": "Item 2" },
                            effectiveVersion: "1.0",
                            validation: { required: false },
                        },
                    ],
                },
            ],
        };

        const issues = validateStudyDesign(mockStudy);

        expect(issues).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    level: 'Error',
                    message: "Duplicate Variable Name: 'I1'. Must be unique across study.",
                    location: 'F2 > I1',
                    sheetName: 'F2',
                }),
            ])
        );
    });

    it('should filter issues to the active CRF sheet only', () => {
        (mockStudy.forms["F1"].itemGroups[0].items[0] as any).itemOid = "";
        (mockStudy.forms["F1"].itemGroups[0].items[0] as any).rowIndex = 3;
        mockStudy.events[0].forms[0].formOid = "NON_EXISTENT_FORM";

        const issues = validateStudyDesign(mockStudy, "F1");

        expect(issues).toHaveLength(1);
        expect(issues[0].sheetName).toBe("F1");
        expect(issues[0].message).toBe("Missing Variable Name.");
    });

    it('should not filter issues when active sheet is a system sheet', () => {
        (mockStudy.forms["F1"].itemGroups[0].items[0] as any).itemOid = "";
        (mockStudy.forms["F1"].itemGroups[0].items[0] as any).rowIndex = 3;
        mockStudy.events[0].forms[0].formOid = "NON_EXISTENT_FORM";

        const issues = validateStudyDesign(mockStudy, "_Schedule");

        expect(issues).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ sheetName: "_Schedule" }),
                expect.objectContaining({ sheetName: "F1" }),
            ])
        );
    });
});
