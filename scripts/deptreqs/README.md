# Departmental Requirements


## Course Code Conventions
| code               | meaning                                               |
| ------------------ | ----------------------------------------------------- |
| AAA 111            | course listing                                        |
| AAA ***            | any course in department AAA                          |
| AAA *              | any course in department AAA                          |
| AAA 2**            | any 200 level course in department AAA                |
| AAA 2*             | any 200 level course in department AAA                |
| LANG 101           | the 101 course in any language department             |
| LANG               | the distribution requirements for any one language    |
| STL                | STL distribution requirement                          |
| STN                | STN distribution requirement                          |
| EC, EM, HA, etc    | Distribution requirement                              |

## Requirements JSON Format

### Variable Name Conventions
| format            |                               |
| ----------------- | ----------------------------- |
| CamelCase         | tree structure variable       |
| under_score       | property of ths tree node     |

### JSON Format

```javascript
{
  "name": "Name Studies", // major name
  "code": "NST", // three-letter dept code
  "AB": true, // AB --> true, BSE --> false
  "certificate": false, // false for majors
  "note": "NST is not a real major.", // optional note to reader
  "url": "https://ua.princeton.edu/academic-units/name-studies", // link to requirements
  "Requirements": [
    {
      "name": "Prerequisites", // requirement name
      "max_counted": 1, // > 0 or "": max passed up to parent. unlimited if empty
      "min_needed": 4, // >= 0 or "ALL": min demanded of children (subrequirements)
      "description": "Prerequisites", // medium length description. usually redundant
      "explanation": "Long text\nfrom dept website", // long human readable description of requirement
      "double_counting_allowed": false, // whether courses may be counted for multiple of its subrequirements
      "pdf_allowed": false, // whether stuent is allowed to take the course SPDF (pass/D/fail)
      "completed_by_semester": 4, // 1-8: semester by which the requirement must be complete
      "ReqList": [ // may be a CourseList, a ReqList, or a Req
        { // ReqList's contain subrequirements (each with the same format as "Prerequisites" requirement above)
          "name": "First Prerequisite", // subrequirement only revealed to user if name is nonempty
          "max_counted": 1,
          "min_needed": 1,
          "description": "A course in the department",
          "explanation": "Long description",
          "CourseList": [ // may be a CourseList, a ReqList, or a Req
            "NST 100",  // CourseList's contain the course codes (see above)
            "NST 2**",  // of courses satisfying the requirement
            "NST 312C", // and sometimes a tab-sparated coure name which is 
            "NST 96",   // ignored by the parser (only for human reference)
            "NST 487    The Study of Modern Names"
          ]
        },
        {
            ...
        }
      ]
    },
    {
        ... //another requirement
    }
    ...
}