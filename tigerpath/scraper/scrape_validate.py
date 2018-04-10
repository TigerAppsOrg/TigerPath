class _ValidateError(Exception):

    def __init__(self, value):
        self.value = value

    def __str__(self):
        return repr(self.value)


def validate_course(course):
    def validate_string(item):
        if item is None or not isinstance(item, str):
            raise _ValidateError(str(item) + ' is not a string')

    def validate_string_upper(item):
        validate_string(item)
        if not item.isupper():
            raise _ValidateError(item + ' is not upper case')

    def validate_boolean(item):
        if not isinstance(item, bool):
            raise _ValidateError(item + ' is not a boolean value')

    def validate_string_not_empty(item):
        validate_string(item)
        if len(item) == 0:
            raise _ValidateError('String is empty')

    def validate_string_max_length(item, length):
        validate_string(item)
        if len(item) > length:
            raise _ValidateError('String ' + item +
                                 ' exceeded max length of ' + str(length))

    def validate_dict(dict, rules):
        for key, validator in rules.items():
            try:
                validator(dict[key])
            except _ValidateError as e:
                raise _ValidateError(key + ": " + str(e))

    def validate_array(array, validator):
        for x in array:
            validator(x)

    semester_validator = {
        'start_date': validate_string_not_empty,
        'end_date': validate_string_not_empty,
        'term_code': validate_string_not_empty
    }

    professor_validator = {
        'full_name': validate_string_not_empty,
    }

    listing_validator = {
        'dept': validate_string_not_empty,
        'code': validate_string_not_empty,
        'is_primary': validate_boolean
    }

    meeting_validator = {
        'start_time': validate_string_not_empty,
        'end_time': validate_string_not_empty,
        'days': lambda x: validate_string_max_length(x, 10),
        'location': validate_string,
    }

    section_validator = {
        'registrar_id': validate_string_not_empty,
        'name': validate_string_not_empty,
        'type': lambda x: validate_string_max_length(x, 3) and validate_string_upper(x),
        'capacity': validate_string_not_empty,
        'enrollment': validate_string_not_empty,
        'meetings': lambda array: validate_array(array, lambda meeting: validate_dict(meeting, meeting_validator)),
    }

    course_validator = {
        'title': validate_string_not_empty,
        'guid': validate_string_not_empty,
        'description': validate_string,
        'semester': lambda x: validate_dict(x, semester_validator),
        'professors': lambda array: validate_array(array, lambda prof: validate_dict(prof, professor_validator)),
        'course_listings': lambda array: validate_array(array, lambda listing: validate_dict(listing, listing_validator)),
        'sections': lambda array: validate_array(array, lambda section: validate_dict(section, section_validator))
    }
    validate_dict(course, course_validator)