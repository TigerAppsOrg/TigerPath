# Major and Certificate Requirements

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

```javascript
{
  "type": "Major", // Major, Certificate, or Degree
  "name": "Name Studies", // major name
  "code": "NST", // three-letter dept code
  "degree": "AB", // AB or BSE for majors, or null otherwise
  "year": 2018, // year in which the requirements apply
  "urls": [ // links to requirements pages
    "https://ua.princeton.edu/academic-units/name-studies", 
    ...
  ],
  "contacts": [ // contacts for the department or certificate
    {
      "type": "Departmental Representative",
      "name": "Dr. Professor",
      "email": "dprof@princeton.edu"
    }
  ],
  "req_list": [ // req_list's contain subrequirements or subrequirements
    {
      "name": "Prerequisites", // requirement name
      "max_counted": 1, // > 0 or null: max passed up to parent. unlimited if empty
      "min_needed": 4, // >= 0 or "ALL": min demanded of children (subrequirements)
      "description": "Prerequisites", // medium length description. usually redundant
      "explanation": "Long text\nfrom dept website", // long human readable description
      "double_counting_allowed": false, // whether courses may count for multiple subrequirements
      "max_common_with_major": 0, // number of courses that can be in common with major
                                  // only relevant for certificates
      "pdfs_allowed": false, // whether stuent is allowed to take the courses SPDF (pass/D/fail)
                             // can be false, true, or a number indicating how many courses
      "completed_by_semester": 4, // 1-8: semester by which the requirement must be complete
      "req_list": [ // may be a course_list, a req_list, a dist_req, or a num_courses
        {
          "name": "First Prerequisite", // a subreq. is only revealed to user if its name is non-null
          "max_counted": 1,
          "min_needed": 1,
          "description": "Take an interesting course in the department",
          "explanation": "Long description",
          "course_list": [ // may be a course_list, a req_list, a dist_req, or a num_courses
            "NST 100",  // course_list's contain the course codes (see above)
            "NST 2**",  // of courses satisfying the requirement
            "NST 312C", // and, optionally, a [tab]-sparated course name which is 
            "NST 96",   // ignored by the parser (only for human reference)
            "NST 487	The Study of Modern Names"
          ]
        },
        {
            ... //another prerequisite
        }
      ]
    },
    {
        ... //another requirement
    }
    ...
  ]
}
```

Note: min\_needed for the root node is always implicitly "ALL" and that max\_counted is irrelevant, so neither is explicitly present

### For Degrees (AB/BSE)

```javascript
{
  "type": "Degree",
  "name": "A.B.", // "A.B." or "B.S.E."
  "year": 2018,
  "urls": [
    "https://ua.princeton.edu/contents/program-study-degree-bachelor-arts",
    ...
  ],
  "contacts": [
    {
      "type": "Dean",
      "name": "Dr. Professor",
      "email": "dprof@princeton.edu"
    }
  ],
  "req_list": [
    {
      "name": "Degree Progress", 
      "max_counted": 1,
      "min_needed": "ALL",
      "description": null,
      "explanation": "Explanation of degree progress requirements",
      "req_list": [
        {
          "name": null,
          "max_counted": 1,
          "min_needed": null,
          "description": null,
          "explanation": null,
          "completed_by_semester": 8,
          "num_courses": 31 // number of course credits that must be completed
        },
        {
          ...
        }
      ]
    },
    {
      "name": "Epistemology and Cognition",
      "max_counted": 1,
      "min_needed": 1,
      "description": "Description",
      "explanation": "Explanation",
      "dist_req": "EC" // STL, STN, EC, EM, HA, etc.
    },
    {
        ... //another requirement
    }
  ]
}
```