'use strict';

module.exports = class PaginatedRequest {
    page = 1;
    size = 20;
    sort_field = "id";
    sort_dir = "ASC";
    toQueryParamRequest(){}
    getPathId(){return null};
    addQueryParams(queryParams){
        queryParams["size"] = this.size;
        queryParams["page"] = this.page;
        queryParams["sort"] = this.sort_field;
        queryParams["sort_dir"] = this.sort_dir;
    }
};