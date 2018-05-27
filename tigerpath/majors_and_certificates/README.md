# Major and Certificate Requirements


##### Form to help in the creation of Major/Certificate JSONs:

<https://preview.c9users.io/bnehoran/majors-and-certificates/JSON_creator.html>

## Course Code Conventions
| code                                              | meaning                                                                           |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| AAA 111<br>AAA 123/BBB 133                        | course listing                                                                    |
| AAA \*\*\*<br>AAA \*                              | any course in department AAA                                                      |
| AAA 2\*\*<br>AAA 2\*                              | any 200 level course in department AAA                                            |
| **LANG** 101                                      | the 101 course in any language department                                         |
| **STL**<br>**STN**<br>**EC**, **EM**, **HA**, etc | Distribution requirements                                                         |
| AAA 101: Intro to Aardvarks                       | course listing with title <br>(title is ignored and only for human readability)   |

## Requirements JSON Format

```javascript
{
  "type": "Major", //* Major, Certificate, or Degree
  "name": "Name Studies", //* major/certificate name (If separate JSONs for same program, specify AB/BSE. For instance, "Computer Science - BSE")
  "code": "NST", //* Three-letter dept code. Not required for certificates. For Spanish/Portuguese and French/Italian, use SPO and FIT, respectively.
  "degree": "AB", //* AB or BSE for majors, or null otherwise
  "year": 2018, //* year in which the requirements apply (2018 means the 2017-2018 school year)
  "description": "These are at most a couple sentences describing the Name Studies major/certificate.\nIt is optional and should be copied from an official source.",
  "allowed_majors": [ // only relevant for certificates
    "NST", // list of majors that are allowed to take the certificate
    ... // default if empty or not present is that all majors are allowed
  ],
  "urls": [ //* links to requirements pages
    "https://ua.princeton.edu/academic-units/name-studies", 
    ... // every source of information on the listed requirements should be included
  ],
  "contacts": [ //* contacts for the department or certificate
    {
      "type": "Departmental Representative",
      "name": "Dr. Professor",
      "email": "dprof@princeton.edu"
    }
  ],
  "req_list": [ //* req_list's contain requirements or subrequirements
    {
      "name": "Prerequisites", //* requirement name
      "max_counted": 1, // > 0 or null: max passed up to parent. unlimited if null
      "min_needed": 4, //* >= 0 or "ALL": min demanded of children (subrequirements)
      "description": "Prerequisites", // medium length description. usually redundant
      "explanation": "Long text\nfrom dept website", //* long human readable description
      "double_counting_allowed": false, // whether courses may count for multiple subrequirements
                                        // should only be enabled for the root of such subtree
      "max_common_with_major": 0, // number of courses that can be in common with major
                                  // only relevant for certificates
      "pdfs_allowed": false, // whether student is allowed to take the courses SPDF (pass/D/fail)
                             // can be false, true, or a number indicating how many courses
      "completed_by_semester": 4, // 1-8: semester by the end of which the requirement must be complete
      "req_list": [ //* may be a course_list, a req_list, a dist_req, or a num_courses
        {
          "name": "First Prerequisite", //* a subreq. is only revealed to user if its name is non-null
          "max_counted": 1, //*
          "min_needed": 1, //*
          "description": "Take an interesting course in the department",
          "explanation": "Long description", //*
          "course_list": [ //* may be a course_list, a req_list, a dist_req, or a num_courses
            "NST 100",  // course_list's contain the course codes (see above)
            "NST 2**",  // of courses satisfying the requirement
            "NST 312C", // and, optionally, a colon-sparated course name which is
            "NST 96",   // ignored by the parser (only for human reference)
            "NST 482/ACR 382",
            "NST 487: The Study of Modern Names"
          ]
        }
        ... //another prerequisite
      ]
    },
    {
      "name": "Unverifiable Requirement", //*
      "max_counted": null, //*
      "min_needed": null, //*
      "explanation": "All students must visit New York City three times.", //*
      "no_req": null //* a no_req should rarely be used in place of a req_list 
                     //  or course_list, but can occasionally be useful for
                     //  requirements like internships that cannot possibely be verified
    }
    ...
  ]
}
```

Note: min\_needed for the root node is always implicitly "ALL" and that max\_counted is irrelevant, so neither is explicitly present.

\* in the comment signifies required field

### For Degrees (AB/BSE)

Additional options available to Degree JSONs

```javascript
{
  "type": "Degree",
  "name": "A.B.", // "A.B." or "B.S.E."
  "code": "AB", // "AB" or "BSE"
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
